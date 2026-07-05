import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function real(v?: string) { return !!v && !/demo|no_enviar|xxx/i.test(v) }

// Envía al cliente su acceso al Portal Mayorista (link con token).
// Email vía Resend (automático) + WhatsApp Business API (si hay token);
// siempre devuelve el link y un wa.me de un toque como respaldo.
export async function POST(req: NextRequest) {
  let body: { mayorista_id?: string; request_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }) }
  if (!body.mayorista_id) return NextResponse.json({ error: 'Falta el cliente' }, { status: 400 })

  const db = createServerClient()
  const { data: may } = await db.from('mayoristas').select('id, nombre, empresa, email, telefono, token').eq('id', body.mayorista_id).maybeSingle()
  if (!may) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  const base = process.env.NEXT_PUBLIC_WHOLESALE_PORTAL_URL && real(process.env.NEXT_PUBLIC_WHOLESALE_PORTAL_URL)
    ? process.env.NEXT_PUBLIC_WHOLESALE_PORTAL_URL.replace(/\/$/, '')
    : new URL(req.url).origin
  const link = `${base}/portal/mayoristas/${may.token}`
  const nombre = (may.nombre || may.empresa || 'cliente').split(' ')[0]
  const texto = `¡Hola ${nombre}! Tu acceso al Portal Mayorista de NOMMA FOOD ya está listo 🌿\nIngresa aquí para ver el catálogo y hacer tus pedidos:\n${link}`

  let emailSent = false, whatsappSent = false

  // Email automático (Resend)
  if (real(process.env.RESEND_API_KEY) && may.email) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.WHOLESALE_ACCESS_REQUEST_FROM_EMAIL || 'NOMMA FOOD <portal@nomafood.cl>',
          to: may.email,
          subject: 'Tu acceso al Portal Mayorista NOMMA FOOD',
          html: `<p>¡Hola ${nombre}!</p><p>Tu acceso al Portal Mayorista de NOMMA FOOD ya está listo. Ingresa para ver el catálogo y hacer tus pedidos:</p><p><a href="${link}">${link}</a></p><p>🌿 Equipo NOMMA FOOD</p>`,
        }),
      })
      emailSent = r.ok
    } catch { /* cae al respaldo */ }
  }

  // WhatsApp Business API (si hay credenciales reales)
  if (real(process.env.WHATSAPP_ACCESS_TOKEN) && process.env.WHATSAPP_PHONE_NUMBER_ID && may.telefono) {
    try {
      const to = may.telefono.replace(/[^0-9]/g, '')
      const r = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: texto } }),
      })
      whatsappSent = r.ok
    } catch { /* cae al respaldo */ }
  }

  // Registro en outbox + historial
  const outbox = [
    may.email ? { canal: 'email', destino: may.email, plantilla: 'acceso_portal', estado: emailSent ? 'enviado' : 'pendiente', payload: { link } } : null,
    may.telefono ? { canal: 'whatsapp', destino: may.telefono, plantilla: 'acceso_portal', estado: whatsappSent ? 'enviado' : 'pendiente', payload: { link } } : null,
  ].filter(Boolean)
  if (outbox.length) await db.from('notifications_outbox').insert(outbox as never[])
  if (body.request_id) {
    await db.from('access_request_events').insert({
      request_id: body.request_id, tipo: 'acceso',
      canal: emailSent ? 'email' : whatsappSent ? 'whatsapp' : 'sistema',
      mensaje: `Acceso enviado${emailSent ? ' por email' : ''}${whatsappSent ? ' por WhatsApp' : ''}: ${link}`,
    })
  }

  const waLink = may.telefono ? `https://wa.me/${may.telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(texto)}` : null
  return NextResponse.json({ ok: true, link, waLink, emailSent, whatsappSent })
}
