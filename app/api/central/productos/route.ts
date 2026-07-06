import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']

type Tipo = 'text' | 'number' | 'bool'
interface Campo { col: string; tipo: Tipo }

// Columnas editables del maestro (whitelist). marca queda fija (NOMMA FOOD).
const CAMPOS: Campo[] = [
  { col: 'nombre', tipo: 'text' }, { col: 'sku', tipo: 'text' },
  { col: 'categoria', tipo: 'text' }, { col: 'subcategoria', tipo: 'text' },
  { col: 'tipo_producto', tipo: 'text' }, { col: 'descripcion', tipo: 'text' },
  { col: 'foto_oficial_url', tipo: 'text' },
  { col: 'maneja_lote', tipo: 'bool' }, { col: 'maneja_vencimiento', tipo: 'bool' },
  { col: 'codigo_tipo', tipo: 'text' }, { col: 'codigo_valor', tipo: 'text' },
  { col: 'activo', tipo: 'bool' },
  { col: 'unidad_venta', tipo: 'text' }, { col: 'cantidad_por_unidad_venta', tipo: 'number' },
  { col: 'unidad_inventario', tipo: 'text' }, { col: 'factor_conversion', tipo: 'number' },
  { col: 'precio', tipo: 'number' }, { col: 'pedido_minimo', tipo: 'number' },
  { col: 'visible_catalogo', tipo: 'bool' },
  { col: 'rendimiento_lote', tipo: 'number' }, { col: 'tiempo_produccion_min', tipo: 'number' },
  { col: 'merma_esperada_pct', tipo: 'number' }, { col: 'modalidad_produccion', tipo: 'text' },
  { col: 'area_responsable', tipo: 'text' },
  { col: 'stock_min', tipo: 'number' }, { col: 'stock_max', tipo: 'number' },
  { col: 'punto_reposicion', tipo: 'number' }, { col: 'ubicacion', tipo: 'text' },
  { col: 'condicion_almacenamiento', tipo: 'text' }, { col: 'vida_util_dias', tipo: 'number' },
  { col: 'dias_min_despacho', tipo: 'number' }, { col: 'estado_calidad', tipo: 'text' },
  { col: 'ubicacion_picking', tipo: 'text' }, { col: 'tipo_embalaje', tipo: 'text' },
  { col: 'peso_aprox_kg', tipo: 'number' }, { col: 'bultos_estimados', tipo: 'number' },
  { col: 'instrucciones_manipulacion', tipo: 'text' },
  { col: 'requiere_fechado', tipo: 'bool' }, { col: 'requiere_etiqueta', tipo: 'bool' },
  { col: 'costo_envase', tipo: 'number' }, { col: 'costo_mano_obra', tipo: 'number' },
  { col: 'costo_receta', tipo: 'number' }, { col: 'costo_total', tipo: 'number' },
  { col: 'margen_bruto', tipo: 'number' },
]

function coerce(tipo: Tipo, v: unknown): string | number | boolean | null {
  if (v === '' || v === null || v === undefined) return tipo === 'bool' ? false : null
  if (tipo === 'number') { const n = Number(v); return Number.isNaN(n) ? null : n }
  if (tipo === 'bool') return Boolean(v)
  return String(v)
}

async function getAdmin() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return null
  const { data: profile } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = (profile?.role as string | undefined) || ''
  return CENTRAL_ROLES.includes(role) ? user : null
}

export async function POST(req: NextRequest) {
  const user = await getAdmin()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: { action?: string; id?: string; fields?: Record<string, unknown> } = {}
  try { body = await req.json() } catch { /* sin body */ }
  const f = body.fields || {}
  const db = createServerClient()
  const email = user.email ?? null

  if (body.action === 'create') {
    const nombre = String(f.nombre || '').trim()
    if (!nombre || f.precio === undefined || f.precio === '') {
      return NextResponse.json({ error: 'El nombre y el precio son obligatorios' }, { status: 400 })
    }
    const unidadVenta = f.unidad_venta ? String(f.unidad_venta) : null
    const { data, error } = await db.from('products').insert({
      nombre,
      sku:           f.sku ? String(f.sku).trim() : null,
      categoria:     f.categoria ? String(f.categoria).trim() : null,
      tipo_producto: f.tipo_producto ? String(f.tipo_producto) : 'terminado_fabricado',
      unidad_venta:  unidadVenta,
      unidad:        unidadVenta || 'un',
      precio:        Number(f.precio),
      stock_actual:  0,
      activo:        true,
    }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await db.from('product_price_history').insert({ product_id: data.id, precio_neto: Number(f.precio), usuario_id: user.id, usuario_email: email })
    return NextResponse.json({ ok: true, id: data.id })
  }

  if (body.action === 'update') {
    if (!body.id) return NextResponse.json({ error: 'Falta el producto' }, { status: 400 })
    const { data: actual } = await db.from('products').select('*').eq('id', body.id).maybeSingle()
    if (!actual) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    const prev = actual as Record<string, unknown>

    const patch: Record<string, unknown> = {}
    const audit: Array<{ product_id: string; usuario_id: string; usuario_email: string | null; campo: string; valor_anterior: string | null; valor_nuevo: string | null }> = []
    let precioNuevo: number | null = null

    for (const c of CAMPOS) {
      if (!(c.col in f)) continue
      const nuevo = coerce(c.tipo, f[c.col])
      const viejo = prev[c.col] ?? null
      if (String(viejo ?? '') === String(nuevo ?? '')) continue
      patch[c.col] = nuevo
      audit.push({ product_id: body.id, usuario_id: user.id, usuario_email: email, campo: c.col, valor_anterior: viejo === null ? null : String(viejo), valor_nuevo: nuevo === null ? null : String(nuevo) })
      if (c.col === 'precio' && typeof nuevo === 'number') precioNuevo = nuevo
    }

    if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true, sinCambios: true })

    // Mantener la columna legacy `unidad` sincronizada (compat portal)
    if (typeof patch.unidad_venta === 'string' && patch.unidad_venta) patch.unidad = patch.unidad_venta

    const { error } = await db.from('products').update(patch).eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (precioNuevo !== null) {
      await db.from('product_price_history').update({ vigente_hasta: new Date().toISOString() }).eq('product_id', body.id).is('vigente_hasta', null)
      await db.from('product_price_history').insert({ product_id: body.id, precio_neto: precioNuevo, usuario_id: user.id, usuario_email: email })
    }
    if (audit.length > 0) await db.from('product_audit_log').insert(audit)

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
