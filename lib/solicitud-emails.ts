// Correos de una nueva solicitud mayorista: aviso a Comercial + confirmación al cliente.
// La confirmación cambia de marca/paleta según el origen (Brotes vs NOMMA).

export type SolicitudResumen = {
  numero: string
  nombre: string
  empresa: string
  email: string
  telefono: string
  comuna: string
  tipo_cliente: string
  volumen_estimado: string
  productos_interes?: string | null
  horario_recepcion?: string | null
  esBrotes: boolean
}

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function val(input?: string | null) {
  return input && input.trim() ? escapeHtml(input.trim()) : 'No informado'
}

// --- Aviso interno a Comercial ---------------------------------------------
export function buildAvisoComercial(s: SolicitudResumen) {
  const marca = s.esBrotes ? 'Brotes Asiáticos' : 'NOMMA FOOD'
  const subject = `Nueva solicitud mayorista ${s.numero} — ${s.empresa || s.nombre} (${marca})`

  const filas: Array<[string, string | null | undefined]> = [
    ['Marca / origen', marca],
    ['N° solicitud', s.numero],
    ['Empresa', s.empresa],
    ['Contacto', s.nombre],
    ['Correo', s.email],
    ['Teléfono', s.telefono],
    ['Comuna', s.comuna],
    ['Tipo de cliente', s.tipo_cliente],
    ['Volumen estimado', s.volumen_estimado],
    ['Productos de interés', s.productos_interes],
    ['Horario de recepción', s.horario_recepcion],
  ]

  const rows = filas
    .map(
      ([label, v]) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #e2e8d5;color:#5a6b3a;font-size:12px;text-transform:uppercase;font-weight:700;">${escapeHtml(label)}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e2e8d5;color:#101828;font-size:15px;font-weight:700;">${val(v)}</td>
        </tr>`
    )
    .join('')

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
  <body style="margin:0;background:#f5f7f0;font-family:Arial,Helvetica,sans-serif;color:#101828;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px;"><tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border:1px solid #cbd8b0;border-radius:14px;overflow:hidden;">
        <tr><td style="background:#0d1b2e;color:#fff;padding:22px 24px;">
          <div style="display:inline-block;background:#b8c987;color:#0d1b2e;font-weight:800;padding:6px 12px;border-radius:999px;font-size:12px;">${escapeHtml(marca.toUpperCase())}</div>
          <h1 style="margin:14px 0 4px;font-size:22px;">Nueva solicitud mayorista</h1>
          <p style="margin:0;color:#dfe7c4;font-size:14px;">Solicitud ${escapeHtml(s.numero)}</p>
        </td></tr>
        <tr><td style="padding:20px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8d5;border-radius:10px;overflow:hidden;">${rows}</table>
          <p style="margin:18px 0 0;font-size:14px;color:#475467;">Revísala y apruébala desde <strong>Central › Comercial › Solicitudes</strong>.</p>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`

  return { subject, html }
}

// --- Confirmación al cliente (marca-consciente) ----------------------------
export function buildConfirmacionCliente(s: SolicitudResumen) {
  const marca = s.esBrotes ? 'Brotes Asiáticos' : 'NOMMA FOOD'
  const firstName = (s.nombre?.trim().split(/\s+/)[0]) || 'Hola'
  const subject = `Recibimos tu solicitud mayorista — ${marca}`

  // Paletas por marca
  const c = s.esBrotes
    ? { head: '#0d0f0d', accent: '#4c9a45', soft: '#eef5e4', line: '#cfe0bd', text: '#2e6a3d', badge: '#4c9a45', badgeText: '#0d0f0d' }
    : { head: '#0d1b2e', accent: '#b8c987', soft: '#f0f4dc', line: '#cbd8b0', text: '#3b5a1f', badge: '#b8c987', badgeText: '#0d1b2e' }

  const resumen: Array<[string, string | null | undefined]> = [
    ['Empresa', s.empresa],
    ['Contacto', s.nombre],
    ['Correo', s.email],
    ['Teléfono', s.telefono],
    ['Horario de recepción', s.horario_recepcion],
  ].filter(([, v]) => Boolean(v && String(v).trim())) as Array<[string, string | null | undefined]>

  const resumenRows = resumen
    .map(
      ([label, v]) => `
        <tr>
          <td style="padding:9px 14px;border-bottom:1px solid ${c.line};color:${c.text};font-size:12px;text-transform:uppercase;font-weight:700;">${escapeHtml(label)}</td>
          <td style="padding:9px 14px;border-bottom:1px solid ${c.line};color:#101828;font-size:15px;font-weight:700;">${val(v)}</td>
        </tr>`
    )
    .join('')

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
  <body style="margin:0;background:#f4f7ef;font-family:Arial,Helvetica,sans-serif;color:#101828;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px;"><tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid ${c.line};border-radius:16px;overflow:hidden;">
        <tr><td style="background:${c.head};color:#fff;padding:26px;">
          <div style="display:inline-block;background:${c.badge};color:${c.badgeText};font-weight:800;padding:7px 12px;border-radius:999px;font-size:12px;letter-spacing:.05em;">${escapeHtml(marca.toUpperCase())}</div>
          <h1 style="margin:16px 0 6px;font-size:23px;line-height:1.25;">Recibimos tu solicitud mayorista</h1>
          <p style="margin:0;color:${c.accent};font-size:14px;">N° ${escapeHtml(s.numero)}</p>
        </td></tr>
        <tr><td style="padding:24px 26px;">
          <p style="margin:0 0 15px;font-size:16px;line-height:1.6;">${escapeHtml(firstName)}, gracias por tu interés en comprar al por mayor en <strong>${escapeHtml(marca)}</strong>. Ya recibimos tu solicitud y nuestro equipo la revisará a la brevedad. Cuando quede aprobada te enviaremos un correo con los pasos para <strong>crear tu usuario</strong> y acceder a los precios mayoristas.</p>
          ${resumenRows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${c.line};border-radius:12px;overflow:hidden;margin:6px 0 16px;">${resumenRows}</table>` : ''}
          <div style="padding:15px;background:${c.soft};border:1px solid ${c.line};border-radius:12px;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:${c.text};">Si algún dato está incorrecto, responde este correo y lo corregimos. No necesitas hacer nada más por ahora.</p>
          </div>
          <p style="margin:22px 0 0;font-size:15px;">Un abrazo,<br /><strong>Equipo ${escapeHtml(marca)}</strong></p>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`

  return { subject, html }
}
