import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { ejecutarAgente } from '@/lib/agente/ejecutar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cron del orquestador: corre un ciclo (señales + informe) sin que nadie esté
// al frente. Lo dispara Vercel Cron (manda Authorization: Bearer <CRON_SECRET>)
// o cualquier scheduler con el secreto. Fail-closed: sin CRON_SECRET no corre.
async function correr(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'cron no configurado' }, { status: 503 })
  const auth = req.headers.get('authorization')
  const q = new URL(req.url).searchParams.get('secret')
  if (auth !== `Bearer ${secret}` && q !== secret) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 })
  }

  try {
    const res = await ejecutarAgente(createServerClient(), 'cron')
    return NextResponse.json({ ok: true, ejecutado: res.ejecutado, stats: res.stats, fuente: res.informe.fuente })
  } catch (e) {
    console.error('[cron/agente] error:', e)
    return NextResponse.json({ error: 'fallo al ejecutar el agente' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) { return correr(req) }
export async function POST(req: NextRequest) { return correr(req) }
