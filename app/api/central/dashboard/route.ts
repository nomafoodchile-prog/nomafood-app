import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
const S = (v: unknown) => (v === null || v === undefined ? '' : String(v))
type Row = Record<string, unknown>

const MAY_PAGADO = ['pagado', 'en_preparacion', 'listo_para_despacho', 'asignado', 'entregado']
const MIN_PAGADO = ['processing', 'completed']
const MAY_PEND = 'pendiente_pago'

function hoyCL(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
}

export async function GET() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!CENTRAL_ROLES.includes(S(profile?.role))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const hoy = hoyCL()
  const mesIni = hoy.slice(0, 8) + '01'
  // primer día del mes hace 5 meses (para la serie de 6 meses)
  const d = new Date(hoy + 'T12:00:00')
  d.setMonth(d.getMonth() - 5); d.setDate(1)
  const serieIni = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(d)

  const [movsR, mayR, minR] = await Promise.all([
    db.from('fin_movimientos').select('fecha, tipo, monto, estado, anulado').eq('anulado', false).gte('fecha', serieIni),
    db.from('mayorista_pedidos').select('id, numero_pedido, estado, total, created_at, mayorista:mayoristas(nombre, empresa)').order('created_at', { ascending: false }).limit(60),
    db.from('minorista_pedidos').select('id, numero, estado, total, created_at, cliente_nombre, marca').order('created_at', { ascending: false }).limit(60),
  ])
  const movs = (movsR.data as Row[] | null) || []
  const may = (mayR.data as Row[] | null) || []
  const min = (minR.data as Row[] | null) || []

  // ── Caja del mes ──
  let ingresosMes = 0, egresosMes = 0, porPagar = 0
  for (const m of movs) {
    const fecha = S(m.fecha)
    if (fecha >= mesIni && S(m.tipo) === 'ingreso') ingresosMes += N(m.monto)
    if (fecha >= mesIni && S(m.tipo) === 'egreso') egresosMes += N(m.monto)
    if (S(m.tipo) === 'egreso' && S(m.estado) === 'pendiente') porPagar += N(m.monto)
  }

  // ── Serie 6 meses (ingresos/egresos) ──
  const meses: { key: string; ingresos: number; egresos: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const dd = new Date(hoy + 'T12:00:00'); dd.setMonth(dd.getMonth() - i)
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit' }).format(dd)
    meses.push({ key, ingresos: 0, egresos: 0 })
  }
  for (const m of movs) {
    const k = S(m.fecha).slice(0, 7)
    const slot = meses.find(x => x.key === k)
    if (slot) { if (S(m.tipo) === 'ingreso') slot.ingresos += N(m.monto); else if (S(m.tipo) === 'egreso') slot.egresos += N(m.monto) }
  }

  // ── Pedidos ──
  let pedidosHoy = 0, porCobrar = 0, porCobrarN = 0
  for (const p of may) {
    if (S(p.created_at).slice(0, 10) === hoy) pedidosHoy++
    if (S(p.estado) === MAY_PEND) { porCobrar += N(p.total); porCobrarN++ }
  }
  for (const p of min) {
    if (S(p.created_at).slice(0, 10) === hoy) pedidosHoy++
  }

  // Pedidos recientes (mezcla may + min), top 7 por fecha
  type Reciente = { id: string; tipo: 'may' | 'min'; numero: string; cliente: string; total: number; estado: string; fecha: string }
  const recientes: Reciente[] = [
    ...may.map(p => ({ id: S(p.id), tipo: 'may' as const, numero: S(p.numero_pedido), cliente: S((p.mayorista as Row)?.empresa) || S((p.mayorista as Row)?.nombre) || '—', total: N(p.total), estado: S(p.estado), fecha: S(p.created_at) })),
    ...min.map(p => ({ id: S(p.id), tipo: 'min' as const, numero: S(p.numero), cliente: S(p.cliente_nombre) || 'Cliente', total: N(p.total), estado: S(p.estado), fecha: S(p.created_at) })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 7)

  // Ventas del mes = ingresos del mes de Caja (ya incluye pedidos pagados sincronizados)
  return NextResponse.json({
    kpis: {
      pedidosHoy,
      ventasMes: ingresosMes,
      porCobrar, porCobrarN,
      porPagar,
      saldoMes: ingresosMes - egresosMes,
    },
    serie: meses,
    recientes,
  })
}
