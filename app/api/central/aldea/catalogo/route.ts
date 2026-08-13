import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']
const UNIDADES = ['unidad', 'bandeja', 'caja', 'bolsa', 'pack', 'kilo', 'litro', 'docena']

async function auth() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return null
  const { data: p } = await createServerClient().from('profiles').select('role, email').eq('id', user.id).maybeSingle()
  if (!CENTRAL_ROLES.includes(String(p?.role || ''))) return null
  return { id: user.id, email: p?.email || user.email || '' }
}

// Sucursales de la cadena interna (Aldea)
async function sucursalesAldea(db: any): Promise<string[]> {
  const { data: org } = await db.from('organizaciones').select('id').eq('tipo', 'cadena_interna').order('created_at').limit(1).maybeSingle()
  if (!org?.id) return []
  const { data: sucs } = await db.from('mayoristas').select('id').eq('organizacion_id', org.id).eq('es_sucursal', true).eq('activo', true)
  return (sucs || []).map((s: any) => s.id)
}

// GET → catálogo Aldea (productos distintos habilitados en los locales)
export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const sucIds = await sucursalesAldea(db)
  if (sucIds.length === 0) return NextResponse.json({ productos: [], categorias: [] })

  const { data: cat } = await db.from('aldea_catalogo').select('product_id, disponible, prioridad_aldea, precio_especial').in('mayorista_id', sucIds)
  const catBy = new Map<string, any>()
  for (const c of cat || []) if (!catBy.has(c.product_id)) catBy.set(c.product_id, c)
  const prodIds = [...catBy.keys()]

  const prodMap = new Map<string, any>()
  if (prodIds.length) {
    const { data: prods } = await db.from('products')
      .select('id, nombre, sku, categoria, precio, unidad_venta, cantidad_por_unidad_venta, imagen_url, foto_oficial_url').in('id', prodIds)
    for (const p of prods || []) prodMap.set(p.id, p)
  }

  const productos = prodIds.map(id => {
    const p = prodMap.get(id) || {}
    const c = catBy.get(id) || {}
    return {
      product_id: id,
      nombre: p.nombre || 'Producto',
      sku: p.sku || '',
      categoria: p.categoria || 'Sin categoría',
      precio: c.precio_especial != null ? Number(c.precio_especial) : (p.precio != null ? Number(p.precio) : null),
      unidad_venta: p.unidad_venta || 'unidad',
      unidades_por_caja: Number(p.cantidad_por_unidad_venta) > 0 ? Number(p.cantidad_por_unidad_venta) : 1,
      imagen_url: p.imagen_url || p.foto_oficial_url || null,
      disponible: c.disponible !== false,
      prioridad: Number(c.prioridad_aldea || 0),
    }
  }).sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre))

  const categorias = [...new Set(productos.map(p => p.categoria))].sort((a, b) => a.localeCompare(b))
  return NextResponse.json({ productos, categorias })
}

// POST → crea un producto y lo habilita en los 3 locales de Aldea
export async function POST(req: NextRequest) {
  const a = await auth()
  if (!a) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const b = await req.json()

  const nombre = String(b.nombre || '').trim()
  const categoria = String(b.categoria || '').trim()
  const precio = (b.precio === '' || b.precio == null) ? null : Number(b.precio)   // opcional: null = precio pendiente
  if (!nombre) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 })
  if (!categoria) return NextResponse.json({ error: 'La categoría es obligatoria.' }, { status: 400 })
  if (precio != null && (!Number.isFinite(precio) || precio <= 0)) return NextResponse.json({ error: 'El precio debe ser un número mayor a 0.' }, { status: 400 })

  const unidad_venta = UNIDADES.includes(String(b.unidad_venta)) ? String(b.unidad_venta) : 'unidad'
  const unxcaja = unidad_venta === 'caja' ? Math.max(1, Number(b.unidades_por_caja) || 1) : 1

  const sucIds = await sucursalesAldea(db)
  if (sucIds.length === 0) return NextResponse.json({ error: 'No hay locales de Aldea configurados.' }, { status: 400 })

  // 1) Crear el producto en el maestro (Aldea-only: no visible al canal mayorista)
  const { data: prod, error: e1 } = await db.from('products').insert({
    nombre,
    sku: b.sku ? String(b.sku).trim() : null,
    categoria,
    tipo_producto: 'terminado_fabricado',
    estado_ciclo: 'borrador',
    unidad_venta,
    unidad: unidad_venta,
    cantidad_por_unidad_venta: unxcaja,
    precio,
    stock_actual: 0,
    visible_catalogo: false,
    activo: true,
  }).select('id').single()
  if (e1 || !prod) return NextResponse.json({ error: 'No se pudo crear el producto.', detail: e1?.message || null }, { status: 500 })

  // Historial de precio (best-effort, solo si hay precio)
  if (precio != null) await db.from('product_price_history').insert({ product_id: prod.id, precio_neto: precio, usuario_id: a.id, usuario_email: a.email })

  // 2) Habilitar en los 3 locales: aldea_stock (informativo, 0) + aldea_catalogo (disponible)
  const prioridad = Number(b.prioridad) || 0
  await db.from('aldea_stock').insert(sucIds.map(m => ({ mayorista_id: m, product_id: prod.id, stock_actual: 0, stock_min: 0, stock_ideal: 0, por_recibir: 0, fuente: 'nomma' })))
  await db.from('aldea_catalogo').insert(sucIds.map(m => ({ mayorista_id: m, product_id: prod.id, tipo: 'producto', activo: true, disponible: true, prioridad_aldea: prioridad })))

  return NextResponse.json({ ok: true, product_id: prod.id })
}

// PATCH → editar precio / disponibilidad / nombre / categoría (en los 3 locales)
export async function PATCH(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const b = await req.json()
  const pid = String(b.product_id || '')
  if (!pid) return NextResponse.json({ error: 'Falta el producto.' }, { status: 400 })
  const sucIds = await sucursalesAldea(db)

  const patch: Record<string, any> = {}
  if (typeof b.nombre === 'string' && b.nombre.trim()) patch.nombre = b.nombre.trim()
  if (typeof b.categoria === 'string' && b.categoria.trim()) patch.categoria = b.categoria.trim()
  if (b.precio !== undefined && Number.isFinite(Number(b.precio)) && Number(b.precio) > 0) patch.precio = Number(b.precio)
  if (Object.keys(patch).length) await db.from('products').update(patch).eq('id', pid)

  if (b.disponible !== undefined && sucIds.length) {
    await db.from('aldea_catalogo').update({ disponible: !!b.disponible }).eq('product_id', pid).in('mayorista_id', sucIds)
  }
  return NextResponse.json({ ok: true })
}

// DELETE → quitar el producto del catálogo de Aldea (no borra el producto maestro)
export async function DELETE(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const pid = req.nextUrl.searchParams.get('product_id') || ''
  if (!pid) return NextResponse.json({ error: 'Falta el producto.' }, { status: 400 })
  const sucIds = await sucursalesAldea(db)
  if (sucIds.length) {
    await db.from('aldea_catalogo').delete().eq('product_id', pid).in('mayorista_id', sucIds)
    await db.from('aldea_stock').delete().eq('product_id', pid).in('mayorista_id', sucIds)
  }
  return NextResponse.json({ ok: true })
}
