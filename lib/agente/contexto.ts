// lib/agente/contexto.ts
// Resumen financiero/operacional (solo lectura) para alimentar al cerebro.
// Reutiliza la MISMA lógica del dashboard real (ingresos del mes, por pagar,
// por cobrar, pedidos de hoy) para que el agente y el dashboard siempre cuadren.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Contexto } from './cerebro'

type Row = Record<string, unknown>
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
const S = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const MAY_PEND = 'pendiente_pago'

function hoyCL(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
}

export async function calcularContexto(db: SupabaseClient): Promise<Contexto> {
  const hoy = hoyCL()
  const mesIni = hoy.slice(0, 8) + '01'

  const [movsR, mayR, minR] = await Promise.all([
    db.from('fin_movimientos').select('fecha, tipo, monto, estado, anulado').eq('anulado', false).gte('fecha', mesIni),
    db.from('mayorista_pedidos').select('id, estado, total, created_at').order('created_at', { ascending: false }).limit(200),
    db.from('minorista_pedidos').select('id, created_at').order('created_at', { ascending: false }).limit(200),
  ])
  const movs = (movsR.data as Row[] | null) || []
  const may = (mayR.data as Row[] | null) || []
  const min = (minR.data as Row[] | null) || []

  let ventasMes = 0, porPagar = 0
  for (const m of movs) {
    if (S(m.tipo) === 'ingreso') ventasMes += N(m.monto)
    if (S(m.tipo) === 'egreso' && S(m.estado) === 'pendiente') porPagar += N(m.monto)
  }

  let porCobrar = 0, pedidosHoy = 0
  for (const p of may) {
    if (S(p.created_at).slice(0, 10) === hoy) pedidosHoy++
    if (S(p.estado) === MAY_PEND) porCobrar += N(p.total)
  }
  for (const p of min) {
    if (S(p.created_at).slice(0, 10) === hoy) pedidosHoy++
  }

  return { ventasMes, porCobrar, porPagar, pedidosHoy }
}
