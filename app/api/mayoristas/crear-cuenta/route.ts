import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Cliente anon (para disparar el correo de recuperación por el SMTP de Supabase)
function anonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
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

  let userId: string | null = null
  let emailSent = false
  let yaExistia = false

  // Invita al cliente: Supabase crea la cuenta y envía el correo por su SMTP (Resend)
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
