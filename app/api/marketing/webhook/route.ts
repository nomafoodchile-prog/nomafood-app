import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
type Row = Record<string, unknown>

// Recibe eventos de Resend (delivered / opened / clicked / bounced)
// y actualiza el envío + recalcula las métricas de la campaña.
export async function POST(req: NextRequest) {
  let body: Row = {}
  try { body = await req.json() as Row } catch { return NextResponse.json({ ok: true }) }
  const type = String(body.type || '')
  const data = (body.data as Row) || {}
  const emailId = String(data.email_id || data.id || '')
  if (!emailId) return NextResponse.json({ ok: true })

  const db = createServerClient()
  const patch: Row = {}
  if (type === 'email.delivered') patch.entregado = true
  else if (type === 'email.opened') patch.abierto = true
  else if (type === 'email.clicked') patch.clic = true
  else if (type === 'email.bounced' || type === 'email.complained') { patch.estado = 'fallido' }
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true })

  const { data: env } = await db.from('mkt_envios').update(patch).eq('provider_id', emailId).select('campana_id').maybeSingle()
  const campId = String((env as Row | null)?.campana_id || '')
  if (!campId) return NextResponse.json({ ok: true })

  // Recalcula métricas agregadas de la campaña
  const { data: envs } = await db.from('mkt_envios').select('estado, entregado, abierto, clic').eq('campana_id', campId)
  const list = (envs as Row[] | null) || []
  const { data: camp } = await db.from('mkt_campanas').select('stats').eq('id', campId).maybeSingle()
  const prev = ((camp as Row | null)?.stats as Row) || {}
  const stats = {
    ...prev,
    entregados: list.filter(e => e.entregado).length,
    abiertos: list.filter(e => e.abierto).length,
    clics: list.filter(e => e.clic).length,
  }
  await db.from('mkt_campanas').update({ stats }).eq('id', campId)
  return NextResponse.json({ ok: true })
}
