import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { buildHtml, resolverAudiencia, validarCampana, enviarCampana, remitentePorMarca } from '@/lib/marketing'

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

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth || !VER.includes(auth.role)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  let body: Row = {}
  try { body = await req.json() as Row } catch { /* sin body */ }
  const action = String(body.action || '')
  const db = createServerClient()
  const puedeEnviar = ENVIAR.includes(auth.role)
  const base = new URL(req.url).origin

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
    const fromPrueba = remitentePorMarca((c.audiencia as Row | undefined)?.marca)
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: fromPrueba, to: emailPrueba, subject: `[PRUEBA] ${S(c.asunto) || 'Campaña'}`, html }) })
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
    const err = validarCampana(camp as Row); if (err) return NextResponse.json({ error: err }, { status: 400 })
    const cuando = S(body.programada_para)
    if (!cuando) return NextResponse.json({ error: 'Indica fecha y hora' }, { status: 400 })
    await db.from('mkt_campanas').update({ estado: 'programada', programada_para: cuando, updated_at: new Date().toISOString() }).eq('id', String(body.id))
    return NextResponse.json({ ok: true })
  }

  // ── Enviar ahora ─────────────────────────────────────────────────
  if (action === 'enviar_ahora') {
    if (!puedeEnviar) return NextResponse.json({ error: 'Solo Administración/Gerencia pueden enviar' }, { status: 403 })
    const { data: camp } = await db.from('mkt_campanas').select('*').eq('id', String(body.id || '')).maybeSingle()
    if (!camp) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    const c = camp as Row
    if (!c.prueba_enviada) return NextResponse.json({ error: 'Debes enviar una prueba antes de enviar la campaña' }, { status: 400 })
    const err = validarCampana(c); if (err) return NextResponse.json({ error: err }, { status: 400 })
    const res = await enviarCampana(db, c, base)
    if (!res.ok) return NextResponse.json({ error: res.error || 'No se pudo enviar' }, { status: 400 })
    return NextResponse.json({ ok: true, enviados: res.enviados, errores: res.errores, total: res.total })
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
