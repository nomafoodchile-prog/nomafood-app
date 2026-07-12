import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { enviarCampana } from '@/lib/marketing'

export const runtime = 'nodejs'

type Row = Record<string, unknown>

// Envía las campañas PROGRAMADAS cuya hora ya llegó. Lo llama un cron
// (Supabase pg_cron o Vercel Cron). Protegido con CRON_SECRET.
async function procesar(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    const q = new URL(req.url).searchParams.get('secret')
    if (auth !== `Bearer ${secret}` && q !== secret) return NextResponse.json({ error: 'no autorizado' }, { status: 401 })
  }
  const db = createServerClient()
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  const ahora = new Date().toISOString()
  const { data } = await db.from('mkt_campanas').select('*')
    .eq('estado', 'programada').lte('programada_para', ahora).limit(20)
  const camps = (data as Row[] | null) || []
  let procesadas = 0
  for (const c of camps) {
    // Doble check: sigue programada (no anulada/pausada en el intertanto)
    const { data: fresca } = await db.from('mkt_campanas').select('estado').eq('id', String(c.id)).maybeSingle()
    if ((fresca as Row | null)?.estado !== 'programada') continue
    await enviarCampana(db, c, base)
    procesadas++
  }
  return NextResponse.json({ ok: true, procesadas, encontradas: camps.length })
}

export async function GET(req: NextRequest) { return procesar(req) }
export async function POST(req: NextRequest) { return procesar(req) }
