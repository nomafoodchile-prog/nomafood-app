// Correos transaccionales de pedidos (NOMMA FOOD) vía Resend.
// Envía SOLO desde el dominio verificado nommafood.cl. Reply-To a una casilla real.
// Nunca lanza: si falta la API key o Resend falla, registra y devuelve {ok:false}.

const RESEND_URL = 'https://api.resend.com/emails'

function fromAddr(): string {
  return process.env.PEDIDOS_FROM_EMAIL || 'NOMMA FOOD <pedidos@nommafood.cl>'
}
function replyTo(): string {
  return process.env.PEDIDOS_REPLY_TO || 'brotesladera@gmail.com'
}

function clp(n: number): string {
  const v = Math.round(Number(n) || 0)
  return '$' + v.toLocaleString('es-CL')
}
function esc(s: string): string {
  return String(s || '').replace(/[&<>"]/g, c => {
    switch (c) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      default: return c
    }
  })
}

// Envoltura de marca (navy + dorado), inline styles para máxima compatibilidad en clientes de correo.
function layout(opts: { titulo: string; preheader: string; cuerpo: string }): string {
  const { titulo, preheader, cuerpo } = opts
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f2ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1b2a4a;">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ec;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(27,42,74,0.08);">
  <tr><td style="background:#1b2a4a;padding:28px 32px;text-align:center;">
    <div style="font-size:22px;font-weight:800;letter-spacing:2px;color:#ffffff;">NOMMA<span style="color:#c9a24e;">FOOD</span></div>
    <div style="font-size:11px;letter-spacing:3px;color:#c9a24e;text-transform:uppercase;margin-top:4px;">${esc(titulo)}</div>
  </td></tr>
  <tr><td style="padding:32px;">${cuerpo}</td></tr>
  <tr><td style="background:#faf8f2;padding:20px 32px;border-top:1px solid #efe9db;text-align:center;">
    <div style="font-size:12px;color:#7a8296;line-height:1.6;">
      Este es un correo automático de tu pedido en <strong style="color:#1b2a4a;">NOMMA FOOD</strong>.<br>
      ¿Dudas? Responde a este correo y te ayudamos. 🌱
    </div>
  </td></tr>
</table>
<div style="max-width:520px;margin-top:14px;font-size:11px;color:#a7adba;">nommafood.cl · Alimentación vegana</div>
</td></tr></table>
</body></html>`
}

async function enviar(to: string, subject: string, html: string, tag: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key || key === 'demo_no_enviar') {
    console.log(`[pedido-emails] sin RESEND_API_KEY, no se envía (${tag})`)
    return { ok: false, error: 'sin_api_key' }
  }
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false, error: 'email_invalido' }
  try {
    const r = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromAddr(), to, reply_to: replyTo(), subject, html }),
    })
    if (r.ok) { const j = await r.json() as { id?: string }; return { ok: true, id: j.id } }
    const e = (await r.text()).slice(0, 200)
    console.error(`[pedido-emails] Resend ${r.status} (${tag}): ${e}`)
    return { ok: false, error: e }
  } catch (ex) {
    console.error(`[pedido-emails] error (${tag}):`, ex)
    return { ok: false, error: String(ex).slice(0, 200) }
  }
}

// ── 1) Pedido recibido con éxito (al confirmarse el pago) ─────────────────────
export async function enviarPedidoRecibido(p: {
  to: string; nombre?: string | null; numero?: string | null; total?: number | null
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const nombre = esc(String(p.nombre || '').split(' ')[0] || 'Hola')
  const ref = p.numero ? esc(p.numero) : null
  const cuerpo = `
    <div style="text-align:center;font-size:40px;line-height:1;margin-bottom:8px;">✅</div>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1b2a4a;text-align:center;">¡Tu pedido fue recibido con éxito!</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a5164;text-align:center;">
      ${nombre}, gracias por tu compra. Te notificaremos cuando tu pedido se encuentre <strong>en ruta</strong>. 🚚
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f2;border:1px solid #efe9db;border-radius:12px;margin-bottom:8px;">
      ${ref ? `<tr><td style="padding:14px 18px;border-bottom:1px solid #efe9db;font-size:13px;color:#7a8296;">N° de pedido</td><td style="padding:14px 18px;border-bottom:1px solid #efe9db;font-size:14px;font-weight:700;color:#1b2a4a;text-align:right;">${ref}</td></tr>` : ''}
      ${p.total ? `<tr><td style="padding:14px 18px;font-size:13px;color:#7a8296;">Total pagado</td><td style="padding:14px 18px;font-size:16px;font-weight:800;color:#c9a24e;text-align:right;">${clp(p.total)}</td></tr>` : ''}
    </table>
    <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#7a8296;text-align:center;">
      Estamos preparando todo con cariño. 🌱
    </p>`
  const html = layout({ titulo: 'Confirmación de pedido', preheader: 'Tu pedido fue recibido con éxito, te notificaremos cuando se encuentre en ruta.', cuerpo })
  return enviar(p.to, '✅ ¡Tu pedido fue recibido con éxito!', html, 'recibido')
}

// ── 2) Pedido en ruta (cuando sale a despacho) ────────────────────────────────
export async function enviarPedidoEnRuta(p: {
  to: string; nombre?: string | null; numero?: string | null; chofer?: string | null; telefono?: string | null
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const nombre = esc(String(p.nombre || '').split(' ')[0] || 'Hola')
  const ref = p.numero ? esc(p.numero) : null
  const cuerpo = `
    <div style="text-align:center;font-size:40px;line-height:1;margin-bottom:8px;">🚚</div>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1b2a4a;text-align:center;">¡Tu pedido va en camino!</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a5164;text-align:center;">
      ${nombre}, tu pedido ${ref ? `<strong>${ref}</strong> ` : ''}ya se encuentra <strong>en ruta</strong>. Pronto llegará. 🌱
    </p>
    ${(p.chofer || p.telefono) ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f2;border:1px solid #efe9db;border-radius:12px;">
      ${p.chofer ? `<tr><td style="padding:14px 18px;font-size:13px;color:#7a8296;">Repartidor</td><td style="padding:14px 18px;font-size:14px;font-weight:700;color:#1b2a4a;text-align:right;">${esc(p.chofer)}</td></tr>` : ''}
      ${p.telefono ? `<tr><td style="padding:14px 18px;font-size:13px;color:#7a8296;border-top:1px solid #efe9db;">Contacto</td><td style="padding:14px 18px;font-size:14px;font-weight:700;color:#1b2a4a;text-align:right;border-top:1px solid #efe9db;">${esc(p.telefono)}</td></tr>` : ''}
    </table>` : ''}`
  const html = layout({ titulo: 'Pedido en ruta', preheader: 'Tu pedido ya va en camino.', cuerpo })
  return enviar(p.to, '🚚 ¡Tu pedido va en camino!', html, 'en_ruta')
}
