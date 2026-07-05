import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
function real(v?: string) { return !!v && !/demo|no_enviar|xxx/i.test(v) }

// Crea la cuenta del cliente mayorista en Supabase Auth y le envía un enlace
// seguro para crear su contraseña (por email vía Resend). No envía contraseñas.
export async function POST(req: NextRequest) {
  let body: { mayorista_id?: string; request_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }) }
  if (!body.mayorista_id) return NextResponse.json({ error: 'Falta el cliente' }, { status: 400 })

  const db = createServerClient()
  const { data: may } = await db.from('mayoristas').select('id, nombre, empresa, email, telefono, profile_id').eq('id', body.mayorista_id).maybeSingle()
  if (!may) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  if (!may.email) return NextResponse.json({ error: 'El cliente no tiene email para crear la cuenta.' }, { status: 400 })

  const origin = new URL(req.url).origin
  const redirectTo = `${origin}/portal/mayoristas/crear-clave`
  const email = may.email.trim().toLowerCase()

  // Genera la cuenta + enlace de invitación (o de recuperación si ya existe)
  let actionLink: string | null = null
  let userId: string | null = null
  const inv = await db.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo } })
  if (inv.error) {
    // Ya existía → enviamos enlace de recuperación para (re)crear la clave
    const rec = await db.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } })
    if (rec.error) return NextResponse.json({ error: 'No se pudo generar el acceso: ' + rec.error.message }, { status: 500 })
    actionLink = rec.data.properties?.action_link ?? null
    userId = rec.data.user?.id ?? null
  } else {
    actionLink = inv.data.properties?.action_link ?? null
    userId = inv.data.user?.id ?? null
  }

  // Vincula la cuenta al cliente y le pone rol Mayorista
  if (userId) {
    await db.from('profiles').update({ role: 'Mayorista', full_name: may.nombre || may.empresa || email }).eq('id', userId)
    await db.from('mayoristas').update({ profile_id: userId }).eq('id', may.id)
  }

  const nombre = (may.nombre || may.empresa || 'cliente').split(' ')[0]

  // Email con el enlace para crear contraseña (Resend)
  let emailSent = false
  if (real(process.env.RESEND_API_KEY) && actionLink) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.WHOLESALE_ACCESS_REQUEST_FROM_EMAIL || 'NOMMA FOOD <portal@nomafood.cl>',
          to: email,
          subject: 'Crea tu contraseña — Portal Mayorista NOMMA FOOD',
          html: `<p>¡Hola ${nombre}!</p><p>Tu cuenta del Portal Mayorista de NOMMA FOOD ya está creada. Crea tu contraseña de forma segura aquí:</p><p><a href="${actionLink}">Crear mi contraseña</a></p><p>Luego podrás ingresar con tu correo <b>${email}</b> para ver el catálogo, hacer pedidos y revisar su estado.</p><p>🌿 Equipo NOMMA FOOD</p>`,
        }),
      })
      emailSent = r.ok
    } catch { /* respaldo manual */ }
  }

  if (body.request_id) {
    await db.from('access_request_events').insert({
      request_id: body.request_id, tipo: 'cuenta', canal: emailSent ? 'email' : 'sistema',
      mensaje: emailSent ? `Cuenta creada e invitación enviada a ${email}.` : `Cuenta creada. Enviar enlace de contraseña manualmente.`,
    })
  }
  await db.from('notifications_outbox').insert({ canal: 'email', destino: email, plantilla: 'crear_clave', estado: emailSent ? 'enviado' : 'pendiente', payload: { link: actionLink } })

  return NextResponse.json({ ok: true, emailSent, email, link: actionLink })
}
