import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const REQUERIDOS = ['nombre', 'empresa', 'rut', 'giro', 'comuna', 'direccion', 'telefono', 'email', 'cargo', 'tipo_cliente', 'volumen_estimado'] as const

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }) }

  // Anti-spam: honeypot (campo oculto que un humano no llena)
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ ok: true, numero: 'SOL-OK' }) // fingimos éxito para el bot
  }
  if (body.consentimiento !== true) {
    return NextResponse.json({ error: 'Debes aceptar la política de privacidad y contacto comercial.' }, { status: 400 })
  }
  for (const k of REQUERIDOS) {
    if (!body[k] || String(body[k]).trim() === '') {
      return NextResponse.json({ error: `Falta el campo: ${k}` }, { status: 400 })
    }
  }
  const email = String(body.email).trim().toLowerCase()
  const rut = String(body.rut).trim()
  const telefono = String(body.telefono).trim()

  const db = createServerClient()

  // Evitar duplicadas (mismo correo / RUT / teléfono con solicitud activa en 90 días)
  const desde = new Date(Date.now() - 90 * 86400000).toISOString()
  const { data: dup } = await db.from('access_requests')
    .select('numero, estado')
    .neq('estado', 'rechazado')
    .gte('created_at', desde)
    .or(`email.eq.${email},rut.eq.${rut},telefono.eq.${telefono}`)
    .limit(1).maybeSingle()
  if (dup) {
    return NextResponse.json({ ok: true, duplicada: true, numero: dup.numero, mensaje: 'Ya tienes una solicitud en curso. Nuestro equipo comercial te contactará.' })
  }

  const insert = {
    nombre: String(body.nombre).trim(),
    empresa: String(body.empresa).trim(),
    rut, giro: String(body.giro).trim(),
    comuna: String(body.comuna).trim(),
    direccion: String(body.direccion).trim(),
    telefono, email,
    cargo: String(body.cargo).trim(),
    tipo_cliente: String(body.tipo_cliente).trim(),
    volumen_estimado: String(body.volumen_estimado).trim(),
    productos_interes: body.productos_interes ? String(body.productos_interes).trim() : null,
    horario_recepcion: body.horario_recepcion ? String(body.horario_recepcion).trim() : null,
    tiene_vitrina: typeof body.tiene_vitrina === 'boolean' ? body.tiene_vitrina : null,
    comentario: body.comentario ? String(body.comentario).trim() : null,
    consentimiento: true,
    origen: body.origen ? String(body.origen).trim().slice(0, 40) : 'directo',
  }

  const { data: sol, error } = await db.from('access_requests').insert(insert).select('id, numero').single()
  if (error || !sol) {
    return NextResponse.json({ error: 'No pudimos registrar tu solicitud. Intenta de nuevo.' }, { status: 500 })
  }

  // Historial + avisos preparados (email a Comercial + WhatsApp de bienvenida)
  await db.from('access_request_events').insert({
    request_id: sol.id, tipo: 'creada', estado: 'nueva', canal: 'sistema',
    mensaje: `Solicitud recibida desde ${insert.origen}.`,
  })
  const outbox: { canal: string; destino: string; plantilla: string; payload: Record<string, unknown> }[] = []
  const comercialEmail = process.env.WHOLESALE_ACCESS_REQUEST_TO_EMAIL
  if (comercialEmail) outbox.push({ canal: 'email', destino: comercialEmail, plantilla: 'nueva_solicitud_comercial', payload: { numero: sol.numero, empresa: insert.empresa, tipo: insert.tipo_cliente, comuna: insert.comuna } })
  if (telefono) outbox.push({ canal: 'whatsapp', destino: telefono, plantilla: 'bienvenida_solicitud', payload: { numero: sol.numero, nombre: insert.nombre } })
  if (outbox.length) await db.from('notifications_outbox').insert(outbox)

  return NextResponse.json({ ok: true, numero: sol.numero })
}
