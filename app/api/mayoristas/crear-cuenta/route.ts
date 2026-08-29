import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { buildBienvenidaBrotes } from '@/lib/solicitud-emails'

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
  const { data: may } = await db.from('mayoristas').select('id, nombre, empresa, email, telefono').eq('id', body.mayorista_id).maybeSingle()
  if (!may) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  if (!may.email) return NextResponse.json({ error: 'El cliente no tiene email para crear la cuenta.' }, { status: 400 })

  const origin = new URL(req.url).origin
  const redirectTo = `${origin}/portal/mayoristas/crear-clave`
  const email = may.email.trim().toLowerCase()
  const nombre = may.nombre || may.empresa || email

  // ¿El cliente viene de Brotes? (por el origen de su solicitud) → marca Brotes en el correo.
  let esBrotes = false
  if (body.request_id) {
    const { data: ar } = await db.from('access_requests').select('origen').eq('id', body.request_id).maybeSingle()
    esBrotes = !!ar?.origen && String(ar.origen).toLowerCase().includes('brotes')
  }

  let userId: string | null = null
  let emailSent = false
  let yaExistia = false

  if (esBrotes) {
    // BROTES: creamos la cuenta y generamos el enlace SIN disparar el correo global de
    // Supabase (que es marca NOMMA). Enviamos NUESTRO propio correo con marca Brotes,
    // usando la cuenta Resend de Brotes. NOMMA no se ve afectado por esta rama.
    // El enlace lleva ?marca=brotes para que la pagina de "crear contraseña" se vea Brotes.
    const redirectBrotes = `${redirectTo}?marca=brotes`
    let actionLink: string | null = null
    const gl = await db.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo: redirectBrotes, data: { full_name: nombre } } })
    if (gl.error) {
      // Ya tenía cuenta → enlace de recuperación (tampoco envía correo)
      yaExistia = true
      const gr = await db.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: redirectBrotes } })
      if (gr.error) return NextResponse.json({ error: 'No se pudo generar el acceso: ' + gr.error.message }, { status: 500 })
      actionLink = gr.data.properties?.action_link ?? null
      userId = gr.data.user?.id ?? null
    } else {
      actionLink = gl.data.properties?.action_link ?? null
      userId = gl.data.user?.id ?? null
    }
    if (actionLink) {
      const from = process.env.WHOLESALE_BROTES_FROM_EMAIL || 'Brotes Asiaticos <hola@brotesasiaticos.cl>'
      const key = real(process.env.WHOLESALE_BROTES_RESEND_KEY) ? process.env.WHOLESALE_BROTES_RESEND_KEY : process.env.RESEND_API_KEY
      const { subject, html } = buildBienvenidaBrotes(nombre, actionLink)
      emailSent = await enviarEmail(from, email, subject, html, key)
    }
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
  const rec2 = await db.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } })
  if (!rec2.error) fallbackLink = rec2.data.properties?.action_link ?? null

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
