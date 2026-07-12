import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const VER = ['SuperAdmin', 'Administracion', 'Gerencia', 'Comercial']
const ENVIAR = ['SuperAdmin', 'Administracion', 'Gerencia']
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
type Row = Record<string, unknown>

async function getAuth() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return null
  const { data: p } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  return { id: user.id, email: user.email ?? null, role: (p?.role as string) || '' }
}

function esc(s: unknown) { return S(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

function buildHtml(c: Row, nombre: string, bajaUrl: string): string {
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

async function resolverAudiencia(db: ReturnType<typeof createServerClient>, aud: Row | null) {
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

function validar(c: Row): string | null {
  if (!S(c.asunto).trim()) return 'Falta el asunto'
  if (!c.audiencia || !S((c.audiencia as Row).segmento)) return 'Falta elegir la audiencia'
  if (!S(c.contenido_html).trim() && !c.imagen_url) return 'Falta el contenido principal (texto o imagen)'
  if (!S(c.boton_url).trim()) return 'Falta el link del botón de compra'
  return null
}

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth || !VER.includes(auth.role)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  let body: Row = {}
  try { body = await req.json() as Row } catch { /* sin body */ }
  const action = String(body.action || '')
  const db = createServerClient()
  const puedeEnviar = ENVIAR.includes(auth.role)
  const base = new URL(req.url).origin
  const from = process.env.MARKETING_FROM_EMAIL || 'NOMMA FOOD <marketing@nomafood.cl>'

  // ── Guardar campaña (crear/actualizar) ───────────────────────────
  if (action === 'guardar') {
    const c = (body.campana as Row) || {}
    const patch: Row = {
      nombre: S(c.nombre) || 'Campaña sin título', canal: S(c.canal) || 'email', asunto: c.asunto ?? null,
      preheader: c.preheader ?? null, remitente_nombre: c.remitente_nombre ?? 'NOMMA FOOD', contenido_html: c.contenido_html ?? null,
      tipografia: c.tipografia ?? 'Poppins', imagen_url: c.imagen_url ?? null, video_url: c.video_url ?? null,
      boton_texto: c.boton_texto ?? null, boton_url: c.boton_url ?? null, productos: c.productos ?? null,
      cupon_id: c.cupon_id ? String(c.cupon_id) : null, audiencia: c.audiencia ?? null, updated_at: new Date().toISOString(),
    }
    if (c.id) {
      const { error } = await db.from('mkt_campanas').update(patch).eq('id', String(c.id))
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, id: c.id })
    }
    const { data, error } = await db.from('mkt_campanas').insert({ ...patch, created_by: auth.id, created_email: auth.email }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: data.id })
  }

  // ── Contar destinatarios de una audiencia ────────────────────────
  if (action === 'audiencia') {
    const contactos = await resolverAudiencia(db, (body.audiencia as Row) || null)
    return NextResponse.json({ ok: true, total: contactos.length, sample: contactos.slice(0, 5).map(c => c.email) })
  }

  // ── Enviar prueba (obligatoria antes de programar/enviar) ────────
  if (action === 'enviar_prueba') {
    const key = process.env.RESEND_API_KEY
    if (!key) return NextResponse.json({ error: 'Falta configurar RESEND_API_KEY en el servidor.' }, { status: 400 })
    const emailPrueba = S(body.email) || auth.email
    if (!emailPrueba) return NextResponse.json({ error: 'Indica un correo de prueba' }, { status: 400 })
    const { data: camp } = await db.from('mkt_campanas').select('*').eq('id', String(body.id || '')).maybeSingle()
    if (!camp) return NextResponse.json({ error: 'Guarda la campaña antes de la prueba' }, { status: 400 })
    const c = camp as Row
    if (c.cupon_id) { const { data: cu } = await db.from('mkt_cupones').select('*').eq('id', String(c.cupon_id)).maybeSingle(); c.cupon = cu }
    const html = buildHtml(c, 'prueba', `${base}/api/marketing/baja?demo=1`)
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: emailPrueba, subject: `[PRUEBA] ${S(c.asunto) || 'Campaña NOMMA FOOD'}`, html }) })
    if (!r.ok) { const t = await r.text(); return NextResponse.json({ error: `No se pudo enviar la prueba: ${t.slice(0, 180)}` }, { status: 500 }) }
    await db.from('mkt_campanas').update({ prueba_enviada: true, updated_at: new Date().toISOString() }).eq('id', String(body.id))
    return NextResponse.json({ ok: true })
  }

  // ── Programar (requiere prueba + validación) — solo enviar ────────
  if (action === 'programar') {
    if (!puedeEnviar) return NextResponse.json({ error: 'Solo Administración/Gerencia pueden programar o enviar' }, { status: 403 })
    const { data: camp } = await db.from('mkt_campanas').select('*').eq('id', String(body.id || '')).maybeSingle()
    if (!camp) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    if (!(camp as Row).prueba_enviada) return NextResponse.json({ error: 'Debes enviar una prueba antes de programar' }, { status: 400 })
    const err = validar(camp as Row); if (err) return NextResponse.json({ error: err }, { status: 400 })
    const cuando = S(body.programada_para)
    if (!cuando) return NextResponse.json({ error: 'Indica fecha y hora' }, { status: 400 })
    await db.from('mkt_campanas').update({ estado: 'programada', programada_para: cuando, updated_at: new Date().toISOString() }).eq('id', String(body.id))
    return NextResponse.json({ ok: true })
  }

  // ── Enviar ahora ─────────────────────────────────────────────────
  if (action === 'enviar_ahora') {
    if (!puedeEnviar) return NextResponse.json({ error: 'Solo Administración/Gerencia pueden enviar' }, { status: 403 })
    const key = process.env.RESEND_API_KEY
    if (!key) return NextResponse.json({ error: 'Falta configurar RESEND_API_KEY en el servidor.' }, { status: 400 })
    const { data: camp } = await db.from('mkt_campanas').select('*').eq('id', String(body.id || '')).maybeSingle()
    if (!camp) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    const c = camp as Row
    if (!c.prueba_enviada) return NextResponse.json({ error: 'Debes enviar una prueba antes de enviar la campaña' }, { status: 400 })
    const err = validar(c); if (err) return NextResponse.json({ error: err }, { status: 400 })
    const contactos = await resolverAudiencia(db, c.audiencia as Row)
    if (contactos.length === 0) return NextResponse.json({ error: 'La audiencia no tiene destinatarios con email' }, { status: 400 })
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
    return NextResponse.json({ ok: true, enviados, errores, total: contactos.length })
  }

  // ── Pausar / anular ──────────────────────────────────────────────
  if (action === 'estado') {
    if (!puedeEnviar) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    const nuevo = S(body.estado)
    if (!['pausada', 'anulada', 'borrador'].includes(nuevo)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    await db.from('mkt_campanas').update({ estado: nuevo, updated_at: new Date().toISOString() }).eq('id', String(body.id || ''))
    return NextResponse.json({ ok: true })
  }

  // ── Cupón: crear ─────────────────────────────────────────────────
  if (action === 'cupon_crear') {
    const codigo = S(body.codigo).trim().toUpperCase()
    if (!codigo) return NextResponse.json({ error: 'Falta el código' }, { status: 400 })
    const { data, error } = await db.from('mkt_cupones').insert({
      codigo, tipo: S(body.tipo) || 'porcentaje', valor: N(body.valor),
      desde: body.desde || null, hasta: body.hasta || null, limite_uso: body.limite_uso ? N(body.limite_uso) : null,
    }).select('id').single()
    if (error) return NextResponse.json({ error: error.message.includes('duplicate') ? 'Ese código ya existe' : error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: data.id })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
