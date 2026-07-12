import { createServerClient } from '@/lib/supabase/server'

type Row = Record<string, unknown>
type DB = ReturnType<typeof createServerClient>
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
function esc(s: unknown) { return S(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

export function buildHtml(c: Row, nombre: string, bajaUrl: string): string {
  const fonts: Record<string, string> = { Poppins: 'Poppins,Arial,sans-serif', Inter: 'Inter,Arial,sans-serif', Playfair: "'Playfair Display',Georgia,serif", Montserrat: 'Montserrat,Arial,sans-serif' }
  const font = fonts[S(c.tipografia)] || 'Arial,sans-serif'
  const prods = Array.isArray(c.productos) ? (c.productos as Row[]) : []
  const prodHtml = prods.map(p => `<div style="border:1px solid #eee;border-radius:10px;padding:12px;margin:8px 0;text-align:center">${p.foto ? `<img src="${esc(p.foto)}" style="max-width:100%;border-radius:8px" alt="">` : ''}<div style="font-weight:600;color:#1b2a4a;margin-top:6px">${esc(p.nombre)}</div>${p.precio ? `<div style="color:#c9a24e;font-weight:600">$${N(p.precio).toLocaleString('es-CL')}</div>` : ''}${p.url ? `<a href="${esc(p.url)}" style="color:#185FA5;font-size:13px">Ver producto</a>` : ''}</div>`).join('')
  const cup = c.cupon as Row | null
  const cupon = cup ? `<div style="background:#f5efdf;border-radius:8px;padding:10px;text-align:center;margin:12px 0;color:#5f4b1a">Cupón <b>${esc(cup.codigo)}</b> — ${S(cup.tipo) === 'porcentaje' ? N(cup.valor) + '%' : '$' + N(cup.valor).toLocaleString('es-CL')} de descuento${cup.hasta ? ` · válido hasta ${esc(cup.hasta)}` : ''}</div>` : ''
  const boton = c.boton_url ? `<div style="text-align:center;margin:22px 0"><a href="${esc(c.boton_url)}" style="background:#c9a24e;color:#1b2a4a;font-weight:600;padding:12px 30px;border-radius:8px;text-decoration:none;display:inline-block">${esc(c.boton_texto) || 'Comprar ahora'}</a></div>` : ''
  const media = c.imagen_url ? `<a href="${esc(c.video_url || c.boton_url || '#')}"><img src="${esc(c.imagen_url)}" style="width:100%;display:block" alt=""></a>` : ''
  const body = esc(c.contenido_html).replace(/\n/g, '<br>')
  return `<div style="font-family:${font};max-width:600px;margin:0 auto;background:#fff">${c.preheader ? `<div style="display:none;max-height:0;overflow:hidden">${esc(c.preheader)}</div>` : ''}${media}<div style="padding:22px;color:#333"><p>¡Hola ${esc(nombre)}!</p><div style="line-height:1.7">${body}</div>${prodHtml}${cupon}${boton}</div><div style="padding:14px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee">NOMMA FOOD · Alma Libre Grupo SpA<br><a href="${bajaUrl}" style="color:#999">Darse de baja</a></div></div>`
}

export async function resolverAudiencia(db: DB, aud: Row | null) {
  const seg = S(aud?.segmento) || 'todos'
  let q = db.from('mayoristas').select('id, nombre, empresa, email, activo, tipo, categoria, created_at, baja_marketing').not('email', 'is', null)
  if (seg === 'activos') q = q.eq('activo', true)
  else if (seg === 'inactivos') q = q.eq('activo', false)
  else if (seg === 'nuevos') q = q.gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
  else if (seg === 'tipo') q = q.eq('tipo', S(aud?.tipo))
  else if (seg === 'categoria') q = q.eq('categoria', S(aud?.categoria))
  else if (seg === 'manual') q = q.in('id', (Array.isArray(aud?.ids) ? aud?.ids : []) as string[])
  const { data } = await q
  return ((data as Row[] | null) || [])
    .filter(m => m.email && !m.baja_marketing)
    .map(m => ({ ref: S(m.id), email: S(m.email), nombre: (S(m.nombre) || S(m.empresa) || 'cliente').split(' ')[0] }))
}

export function validarCampana(c: Row): string | null {
  if (!S(c.asunto).trim()) return 'Falta el asunto'
  if (!c.audiencia || !S((c.audiencia as Row).segmento)) return 'Falta elegir la audiencia'
  if (!S(c.contenido_html).trim() && !c.imagen_url) return 'Falta el contenido principal (texto o imagen)'
  if (!S(c.boton_url).trim()) return 'Falta el link del botón de compra'
  return null
}

// Envía la campaña a toda su audiencia. Usado por el API y por el cron.
export async function enviarCampana(db: DB, c: Row, base: string): Promise<{ ok: boolean; enviados: number; errores: number; total: number; error?: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, enviados: 0, errores: 0, total: 0, error: 'Falta configurar RESEND_API_KEY' }
  const from = process.env.MARKETING_FROM_EMAIL || 'NOMMA FOOD <marketing@nomafood.cl>'
  const contactos = await resolverAudiencia(db, c.audiencia as Row)
  if (contactos.length === 0) return { ok: false, enviados: 0, errores: 0, total: 0, error: 'La audiencia no tiene destinatarios con email' }
  if (c.cupon_id) { const { data: cu } = await db.from('mkt_cupones').select('*').eq('id', String(c.cupon_id)).maybeSingle(); c.cupon = cu }
  let enviados = 0, errores = 0
  const rows: Row[] = []
  for (const ct of contactos) {
    const bajaUrl = `${base}/api/marketing/baja?e=${encodeURIComponent(ct.email)}&camp=${S(c.id)}`
    const html = buildHtml(c, ct.nombre, bajaUrl)
    let ok = false, provider: string | null = null, e: string | null = null
    try {
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: ct.email, subject: S(c.asunto), html }) })
      ok = r.ok
      if (ok) { const j = await r.json() as Row; provider = S(j.id) } else { e = (await r.text()).slice(0, 180) }
    } catch (ex) { e = String(ex).slice(0, 180) }
    if (ok) enviados++; else errores++
    rows.push({ campana_id: c.id, contacto_ref: ct.ref, contacto_email: ct.email, contacto_nombre: ct.nombre, estado: ok ? 'enviado' : 'fallido', error: e, provider_id: provider, sent_at: ok ? new Date().toISOString() : null })
  }
  await db.from('mkt_envios').insert(rows)
  await db.from('mkt_campanas').update({ estado: 'enviada', stats: { total: contactos.length, enviados, errores, entregados: 0, abiertos: 0, clics: 0, compras: 0, monto: 0 }, updated_at: new Date().toISOString() }).eq('id', String(c.id))
  return { ok: true, enviados, errores, total: contactos.length }
}
