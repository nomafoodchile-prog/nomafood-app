import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']

async function esAdmin(): Promise<boolean> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return false
  const { data: p } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  return CENTRAL_ROLES.includes(String(p?.role || ''))
}

function calc(r: { objetivo: number; minimo: number; critico: number; fisico: number; comprometido: number }) {
  const disponible = Math.max(0, Number(r.fisico) - Number(r.comprometido))
  const reposicion = Math.max(0, Number(r.objetivo) - Number(r.fisico))
  const estado = disponible <= Number(r.critico) ? 'critico' : disponible <= Number(r.minimo) ? 'reponer' : 'normal'
  return { disponible, reposicion, estado }
}

// GET → cada producto del catálogo Aldea con su reserva (o defaults) + cálculo
export async function GET() {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()

  const { data: org } = await db.from('organizaciones').select('id, nombre').eq('tipo', 'cadena_interna').order('created_at').limit(1).maybeSingle()
  const organizacion_id = org?.id || null

  // Productos autorizados (distinct del catálogo de las sucursales de la org)
  const { data: sucs } = await db.from('mayoristas').select('id').eq('organizacion_id', organizacion_id).eq('es_sucursal', true)
  const sucIds = (sucs || []).map(s => s.id)
  let prodIds: string[] = []
  if (sucIds.length) {
    const { data: cat } = await db.from('aldea_catalogo').select('product_id').in('mayorista_id', sucIds)
    prodIds = [...new Set((cat || []).map(c => c.product_id))]
  }
  if (prodIds.length === 0) {
    const { data: vis } = await db.from('products').select('id').eq('visible_catalogo', true).limit(50)
    prodIds = (vis || []).map(p => p.id)
  }

  const prodMap = new Map<string, any>()
  if (prodIds.length) {
    const { data: prods } = await db.from('products').select('id, nombre, sku, imagen_url, foto_oficial_url, unidad_venta').in('id', prodIds)
    for (const p of prods || []) prodMap.set(p.id, p)
  }
  const resMap = new Map<string, any>()
  const { data: rows } = await db.from('aldea_reserva').select('*').eq('organizacion_id', organizacion_id)
  for (const r of rows || []) resMap.set(r.product_id, r)

  const items = prodIds.map(pid => {
    const p = prodMap.get(pid) || {}
    const r = resMap.get(pid) || { objetivo: 0, minimo: 0, critico: 0, fisico: 0, comprometido: 0, activo: false }
    const c = calc(r)
    return {
      product_id: pid,
      nombre: p.nombre || 'Producto', sku: p.sku || '', imagen_url: p.imagen_url || p.foto_oficial_url || null,
      configurada: !!resMap.get(pid),
      objetivo: Number(r.objetivo), minimo: Number(r.minimo), critico: Number(r.critico),
      fisico: Number(r.fisico), comprometido: Number(r.comprometido),
      ...c,
    }
  }).sort((a, b) => ({ critico: 0, reponer: 1, normal: 2 } as any)[a.estado] - ({ critico: 0, reponer: 1, normal: 2 } as any)[b.estado])

  const alertas = items.filter(i => i.configurada && i.estado !== 'normal')
  return NextResponse.json({ organizacion_id, items, alertas: alertas.length })
}

// POST → guardar la reserva de un SKU
export async function POST(req: NextRequest) {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const b = await req.json()
  if (!b.product_id || !b.organizacion_id) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  const n = (v: any) => Math.max(0, Number(v) || 0)

  const { error } = await db.from('aldea_reserva').upsert({
    organizacion_id: b.organizacion_id,
    product_id: b.product_id,
    objetivo: n(b.objetivo), minimo: n(b.minimo), critico: n(b.critico),
    fisico: n(b.fisico), comprometido: n(b.comprometido),
    activo: true, updated_at: new Date().toISOString(),
  }, { onConflict: 'organizacion_id,product_id' })
  if (error) return NextResponse.json({ error: 'No se pudo guardar.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
