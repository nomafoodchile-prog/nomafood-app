import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { buildBienvenidaBrotes } from '@/lib/solicitud-emails'
import { randomBytes, createHash } from 'node:crypto'

export const runtime = 'nodejs'

// Cliente anon (para disparar el correo de recuperación por el SMTP de Supabase)
function anonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

function real(v?: string) { return !!v && !/demo|no_enviar|xxx/i.test(v) }

// Envío directo por Resend (para el correo propio de Brotes). No lanza.
async function enviarEmail(from: string, to: string, subject: string, html: string, apiKey = process.env.RESEND_API_KEY) {
  if (!real(apiKey) || !to) return false
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    })
    return r.ok
  } catch {
    return false
  }
}

// Crea la cuenta del cliente mayorista en Supabase Auth y le ENVÍA la invitación
// para crear su contraseña a través del SMTP de Supabase (Resend). No envía
// contraseñas. Devuelve un enlace de respaldo por si el correo no llega.
export async function POST(req: NextRequest) {
  let body: { mayorista_id?: string; request_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }) }
  if (!body.mayorista_id) return NextResponse.json({ error: 'Falta el cliente' }, { status: 400 })

  const db = createServerClient()
  const { data: may } = await db.from('mayoristas').select('id, nombre, empresa, email, telefono, marca').eq('id', body.mayorista_id).maybeSingle()
  if (!may) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  if (!may.email) return NextResponse.json({ error: 'El cliente no tiene email para crear la cuenta.' }, { status: 400 })

  const origin = new URL(req.url).origin
  const redirectTo = `${origin}/portal/mayoristas/crear-clave`
  const email = may.email.trim().toLowerCase()
  const nombre = may.nombre || may.empresa || email

  // ¿El cliente viene de Brotes? (por el origen de su solicitud) → marca Brotes en el correo.
  // Deteccion robusta: por la marca del cliente (autoritativa) O por el origen de su solicitud.
  let esBrotes = String((may as { marca?: string }).marca || '').toLowerCase().includes('brotes')
  if (!esBrotes && body.request_id) {
    const { data: ar } = await db.from('access_requests').select('origen').eq('id', body.request_id).maybeSingle()
    esBrotes = !!ar?.origen && String(ar.origen).toLowerCase().includes('brotes')
  }

  let userId: string | null = null
  let emailSent = false
  let yaExistia = false
  let brotesTokenLink: string | null = null

  if (esBrotes) {
    // BROTES: creamos la cuenta y enviamos NUESTRO propio correo (Resend) con un TOKEN
    // PROPIO y durable (7 dias). NO usamos el enlace magico de Supabase porque Gmail lo
    // pre-escanea y lo consume (queda "expirado"). El token propio no se rompe con eso.
    const redirectBrotes = `${redirectTo}?marca=brotes`
    // generateLink crea la cuenta (o detecta que ya existe) sin enviar correo de Supabase.
    const gl = await db.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo: redirectBrotes, data: { full_name: nombre } } })
    if (gl.error) {
      yaExistia = true
      const gr = await db.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: redirectBrotes } })
      if (gr.error) return NextResponse.json({ error: 'No se pudo generar el acceso: ' + gr.error.message }, { status: 500 })
      userId = gr.data.user?.id ?? null
    } else {
      userId = gl.data.user?.id ?? null
    }
    // Token propio (durable, hasheado en BD). El enlace del correo lleva el token en crudo.
    const raw = randomBytes(24).toString('hex')
    const hash = createHash('sha256').update(raw).digest('hex')
    const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    await db.from('mayoristas').update({ clave_token: hash, clave_token_exp: exp }).eq('id', may.id)
    brotesTokenLink = `${origin}/portal/mayoristas/crear-clave?marca=brotes&token=${raw}`
    const from = process.env.WHOLESALE_BROTES_FROM_EMAIL || 'Brotes Asiaticos <hola@brotesasiaticos.cl>'
    const key = real(process.env.WHOLESALE_BROTES_RESEND_KEY) ? process.env.WHOLESALE_BROTES_RESEND_KEY : process.env.RESEND_API_KEY
    const { subject, html } = buildBienvenidaBrotes(nombre, brotesTokenLink)
    emailSent = await enviarEmail(from, email, subject, html, key)
  } else {
    // NOMMA: comportamiento original — Supabase crea la cuenta y envía el correo por su SMTP.
    const inv = await db.auth.admin.inviteUserByEmail(email, { redirectTo, data: { full_name: nombre } })
    if (inv.error) {
      // Ya tenía cuenta → enviamos correo de recuperación por el SMTP para que (re)cree su contraseña
      yaExistia = true
      const rp = await anonClient().auth.resetPasswordForEmail(email, { redirectTo })
      if (!rp.error) emailSent = true
      const rec = await db.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } })
      if (rec.error) return NextResponse.json({ error: 'No se pudo generar el acceso: ' + rec.error.message }, { status: 500 })
      userId = rec.data.user?.id ?? null
    } else {
      userId = inv.data.user?.id ?? null
      emailSent = true // Supabase disparó el correo de invitación
    }
  }

  // Enlace de respaldo (copiar / WhatsApp) por si el correo no llega
  let fallbackLink: string | null = null
  if (esBrotes) {
    fallbackLink = brotesTokenLink
  } else {
    const rec2 = await db.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } })
    if (!rec2.error) fallbackLink = rec2.data.properties?.action_link ?? null
  }

  // Vincula la cuenta al cliente; solo marca rol Mayorista si es cuenta nueva (no pisar admins)
  if (userId) {
    if (!yaExistia) await db.from('profiles').update({ role: 'Mayorista', full_name: nombre }).eq('id', userId)
    await db.from('mayoristas').update({ profile_id: userId }).eq('id', may.id)
  }

  if (body.request_id) {
    await db.from('access_request_events').insert({
      request_id: body.request_id, tipo: 'cuenta', canal: emailSent ? 'email' : 'sistema',
      mensaje: emailSent ? `Cuenta creada e invitación enviada a ${email}.` : `Cuenta ya existía. Enviar enlace de acceso a ${email}.`,
    })
  }
  await db.from('notifications_outbox').insert({ canal: 'email', destino: email, plantilla: 'invitacion_portal', estado: emailSent ? 'enviado' : 'pendiente', payload: { link: fallbackLink } })

  return NextResponse.json({ ok: true, emailSent, yaExistia, email, link: fallbackLink })
}
