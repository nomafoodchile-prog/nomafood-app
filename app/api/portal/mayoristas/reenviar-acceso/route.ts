import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { buildBienvenidaBrotes } from '@/lib/solicitud-emails'
import { randomBytes, createHash } from 'node:crypto'

export const runtime = 'nodejs'

function real(v?: string) { return !!v && !/demo|no_enviar|xxx/i.test(v) }

async function enviarEmail(from: string, to: string, subject: string, html: string, apiKey = process.env.RESEND_API_KEY) {
  if (!real(apiKey) || !to) return false
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    })
    return r.ok
  } catch { return false }
}

// POST { email } — Reenvía el acceso al cliente. Para Brotes usa NUESTRO correo
// (marca Brotes) + token propio durable. Para NOMMA, el flujo Supabase de siempre.
// Respuesta genérica (no revela si el correo existe).
export async function POST(req: NextRequest) {
  let body: { email?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: true }) }
  const email = (body.email || '').trim().toLowerCase()
  if (!email) return NextResponse.json({ ok: true })

  const db = createServerClient()
  const origin = new URL(req.url).origin
  const { data: may } = await db.from('mayoristas')
    .select('id, nombre, empresa, marca')
    .eq('email', email).order('created_at', { ascending: false }).limit(1).maybeSingle()

  if (!may) return NextResponse.json({ ok: true }) // no revelar

  const esBrotes = String((may as { marca?: string }).marca || '').toLowerCase().includes('brotes')

  if (esBrotes) {
    const raw = randomBytes(24).toString('hex')
    const hash = createHash('sha256').update(raw).digest('hex')
    const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    await db.from('mayoristas').update({ clave_token: hash, clave_token_exp: exp }).eq('id', may.id)
    const link = `${origin}/portal/mayoristas/crear-clave?marca=brotes&token=${raw}`
    const from = process.env.WHOLESALE_BROTES_FROM_EMAIL || 'Brotes Asiaticos <hola@brotesasiaticos.cl>'
    const key = real(process.env.WHOLESALE_BROTES_RESEND_KEY) ? process.env.WHOLESALE_BROTES_RESEND_KEY : process.env.RESEND_API_KEY
    const { subject, html } = buildBienvenidaBrotes(may.nombre || may.empresa || email, link)
    await enviarEmail(from, email, subject, html, key)
  } else {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await anon.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/portal/mayoristas/crear-clave` })
  }

  return NextResponse.json({ ok: true })
}
