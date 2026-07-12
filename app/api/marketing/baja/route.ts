import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Baja de marketing (unsubscribe) — se abre desde el link del correo.
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const email = url.searchParams.get('e')
  const camp = url.searchParams.get('camp')
  const html = (msg: string) => new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div style="font-family:system-ui,sans-serif;max-width:420px;margin:80px auto;text-align:center;color:#1b2a4a"><h2>NOMMA FOOD</h2><p>${msg}</p></div>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
  if (!email) return html('Enlace inválido.')
  try {
    const db = createServerClient()
    await db.from('mayoristas').update({ baja_marketing: true }).eq('email', email)
    if (camp) await db.from('mkt_envios').update({ baja: true }).eq('contacto_email', email).eq('campana_id', camp)
  } catch { /* mejor esfuerzo */ }
  return html('Listo, no recibirás más correos de marketing. 🌿')
}
