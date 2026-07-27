import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { buildAvisoComercial, buildConfirmacionCliente, type SolicitudResumen } from '@/lib/solicitud-emails'

export const runtime = 'nodejs'

const REQUERIDOS = ['nombre', 'empresa', 'rut', 'giro', 'comuna', 'direccion', 'telefono', 'email', 'cargo', 'tipo_cliente', 'volumen_estimado'] as const

function real(v?: string) { return !!v && !/demo|no_enviar|xxx/i.test(v) }

// --- CORS: permite el formulario externo de Brotes (u otros orígenes autorizados) ---
const ORIGENES_PERMITIDOS = (process.env.WHOLESALE_ALLOWED_ORIGINS || 'https://brotesasiaticos.cl,https://www.brotesasiaticos.cl')
  .split(',').map((o) => o.trim()).filter(Boolean)

function corsHeaders(origin: string | null): Record<string, string> {
  const permitido = origin && ORIGENES_PERMITIDOS.includes(origin) ? origin : ORIGENES_PERMITIDOS[0] || ''
  return {
    'Access-Control-Allow-Origin': permitido,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

// Envía un correo por Resend. No lanza: devuelve true/false.
async function enviarEmail(from: string, to: string, subject: string, html: string) {
  if (!real(process.env.RESEND_API_KEY) || !to) return false
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    })
    return r.ok
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req.headers.get('origin'))
  const json = (data: Record<string, unknown>, status = 200) => NextResponse.json(data, { status, headers: cors })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Solicitud inválida' }, 400) }

  // Anti-spam: honeypot (campo oculto que un humano no llena)
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json({ ok: true, numero: 'SOL-OK' }) // fingimos éxito para el bot
  }
  if (body.consentimiento !== true) {
    return json({ error: 'Debes aceptar la política de privacidad y contacto comercial.' }, 400)
  }
  for (const k of REQUERIDOS) {
    if (!body[k] || String(body[k]).trim() === '') {
      return json({ error: `Falta el campo: ${k}` }, 400)
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
    return json({ ok: true, duplicada: true, numero: dup.numero, mensaje: 'Ya tienes una solicitud en curso. Nuestro equipo comercial te contactará.' })
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
    return json({ error: 'No pudimos registrar tu solicitud. Intenta de nuevo.' }, 500)
  }

  // Historial
  await db.from('access_request_events').insert({
    request_id: sol.id, tipo: 'creada', estado: 'nueva', canal: 'sistema',
    mensaje: `Solicitud recibida desde ${insert.origen}.`,
  })

  // Avisos por correo (Resend, en vivo): aviso a Comercial + confirmación al cliente.
  // La marca se deduce del campo `origen` Y del origen real de la petición (CORS),
  // para que un cliente de Brotes nunca reciba marca NOMMA por un `origen` omitido.
  const esBrotes = insert.origen.toLowerCase().includes('brotes')
    || (req.headers.get('origin') || '').toLowerCase().includes('brotes')
  const resumen: SolicitudResumen = {
    numero: sol.numero, nombre: insert.nombre, empresa: insert.empresa, email: insert.email,
    telefono: insert.telefono, comuna: insert.comuna, tipo_cliente: insert.tipo_cliente,
    volumen_estimado: insert.volumen_estimado, productos_interes: insert.productos_interes,
    horario_recepcion: insert.horario_recepcion, esBrotes,
  }
  const remitenteNomma = process.env.WHOLESALE_ACCESS_REQUEST_FROM_EMAIL || 'NOMMA FOOD <portal@nomafood.cl>'
  const remitenteCliente = esBrotes
    ? (process.env.WHOLESALE_BROTES_FROM_EMAIL || remitenteNomma)
    : remitenteNomma
  const comercialEmail = process.env.WHOLESALE_ACCESS_REQUEST_TO_EMAIL

  // En paralelo (enviarEmail nunca lanza: devuelve false si falla o está en demo).
  const aviso = buildAvisoComercial(resumen)
  const conf = buildConfirmacionCliente(resumen)
  const [avisoSent, clienteSent] = await Promise.all([
    comercialEmail ? enviarEmail(remitenteNomma, comercialEmail, aviso.subject, aviso.html) : Promise.resolve(false),
    enviarEmail(remitenteCliente, insert.email, conf.subject, conf.html),
  ])

  // Registro en outbox (queda el rastro aunque el envío directo falle o esté en demo)
  const outbox: { canal: string; destino: string; plantilla: string; estado: string; payload: Record<string, unknown> }[] = []
  if (comercialEmail) outbox.push({ canal: 'email', destino: comercialEmail, plantilla: 'nueva_solicitud_comercial', estado: avisoSent ? 'enviado' : 'pendiente', payload: { numero: sol.numero, empresa: insert.empresa, tipo: insert.tipo_cliente, comuna: insert.comuna, origen: insert.origen } })
  outbox.push({ canal: 'email', destino: insert.email, plantilla: 'confirmacion_solicitud', estado: clienteSent ? 'enviado' : 'pendiente', payload: { numero: sol.numero, marca: esBrotes ? 'Brotes' : 'NOMMA' } })
  if (telefono) outbox.push({ canal: 'whatsapp', destino: telefono, plantilla: 'bienvenida_solicitud', estado: 'pendiente', payload: { numero: sol.numero, nombre: insert.nombre } })
  if (outbox.length) await db.from('notifications_outbox').insert(outbox)

  return json({ ok: true, numero: sol.numero })
}
