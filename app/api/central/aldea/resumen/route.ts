import { NextResponse } from 'next/server'
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

// GET → resumen consolidado de las cafeterías Aldea (para Gerencia)
export async function GET() {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()

  const { data: sucs } = await db.from('mayoristas').select('id, nombre').eq('es_sucursal', true).eq('activo', true).order('nombre')
  const sucIds = (sucs || []).map(s => s.id)
  if (sucIds.length === 0) return NextResponse.json({ locales: [], consolidado: {} })

  const [{ data: stock }, { data: sols }, { data: incs }, { data: facts }] = await Promise.all([
    db.from('aldea_stock').select('mayorista_id, stock_actual, stock_min').in('mayorista_id', sucIds),
    db.from('aldea_solicitudes').select('mayorista_id, folio, estado, updated_at, created_at').in('mayorista_id', sucIds),
    db.from('aldea_incidencias').select('mayorista_id, estado').in('mayorista_id', sucIds),
    db.from('aldea_facturas').select('mayorista_id, monto, estado').in('mayorista_id', sucIds),
  ])

  const esCritico = (a: number, m: number) => a <= 0 || a < m * 0.34
  const entregada = (e: string) => e === 'entregada' || e === 'entregada_diferencias'

  const locales = (sucs || []).map(s => {
    const st = (stock || []).filter(x => x.mayorista_id === s.id)
    const stock_critico = st.filter(x => esCritico(Number(x.stock_actual), Number(x.stock_min))).length
    const mis = (sols || []).filter(x => x.mayorista_id === s.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    const ultimo = mis[0] || null
    const entregas = mis.filter(x => entregada(x.estado)).sort((a, b) => String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)))
    const inc_ab = (incs || []).filter(x => x.mayorista_id === s.id && !['resuelta', 'cerrada'].includes(x.estado)).length
    const fpp = (facts || []).filter(x => x.mayorista_id === s.id && x.estado !== 'pagada').reduce((n, x) => n + Number(x.monto), 0)
    return {
      id: s.id, nombre: s.nombre, stock_critico,
      ultimo_pedido: ultimo ? { folio: ultimo.folio, estado: ultimo.estado } : null,
      incidencias_abiertas: inc_ab,
      facturas_por_pagar: fpp,
      ultima_entrega: entregas[0] ? (entregas[0].updated_at || entregas[0].created_at) : null,
    }
  })

  const consolidado = {
    pedidos_total: (sols || []).length,
    incidencias_abiertas: (incs || []).filter(x => !['resuelta', 'cerrada'].includes(x.estado)).length,
    diferencias: (sols || []).filter(x => x.estado === 'entregada_diferencias').length,
    stock_critico: locales.reduce((n, l) => n + l.stock_critico, 0),
    facturas_por_pagar: locales.reduce((n, l) => n + l.facturas_por_pagar, 0),
    solicitudes_abiertas: (sols || []).filter(x => !['entregada', 'entregada_diferencias', 'cancelada'].includes(x.estado)).length,
  }

  return NextResponse.json({ locales, consolidado })
}
