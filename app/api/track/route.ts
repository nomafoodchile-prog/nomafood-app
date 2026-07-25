import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Registro público de visitas (fire-and-forget). No debe romper la navegación.
const clip = (v: unknown, n = 300) =>
  v === null || v === undefined || v === '' ? null : String(v).slice(0, n)

export async function POST(req: NextRequest) {
  try {
    const b = await req.json().catch(() => ({} as Record<string, unknown>))
    await createServerClient().from('web_visits').insert({
      path:         clip(b.path, 300),
      referrer:     clip(b.referrer, 300),
      utm_source:   clip(b.utm_source, 120),
      utm_medium:   clip(b.utm_medium, 120),
      utm_campaign: clip(b.utm_campaign, 120),
      visitor_id:   clip(b.visitor_id, 60),
    })
  } catch {
    /* nunca fallar por analítica */
  }
  return NextResponse.json({ ok: true })
}
