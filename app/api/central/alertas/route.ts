import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
type Row = Record<string, unknown>

async function getAuth() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return null
  const { data: p } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = (p?.role as string | undefined) || ''
  return CENTRAL_ROLES.includes(role) ? { id: user.id, email: user.email ?? null, role } : null
}

interface Issue { tipo: string; prioridad: string; area: string; titulo: string; mensaje: string; accion_sugerida: string; clave: string; suena: boolean; ref_tipo: string; ref_id: string; estado: string }

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: Row = {}
  try { body = await req.json() as Row } catch { /* sin body */ }
  const action = String(body.action || '')
  const db = createServerClient()

  if (action === 'marcar_vistas') {
    await db.from('notificaciones').update({ estado: 'vista', updated_at: new Date().toISOString() }).eq('estado', 'nueva')
    return NextResponse.json({ ok: true })
  }

  if (action === 'estado') {
    const id = String(body.id || '')
    const estado = String(body.estado || '')
    if (!id || !['vista', 'en_revision', 'resuelta'].includes(estado)) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    await db.from('notificaciones').update({ estado, usuario_atiende: auth.email, comentario_cierre: body.comentario ? String(body.comentario) : null, updated_at: new Date().toISOString() }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'generar') {
    const { data: prods } = await db.from('products').select('id, nombre, stock_min').not('stock_min', 'is', null)
    const { data: lotes } = await db.from('inventario_lotes').select('id, product_id, stock_disponible, stock_reservado, stock_retenido, stock_bloqueado, estado, fecha_vencimiento, lote_codigo, producto:products(nombre)')

    const netoByProd = new Map<string, number>()
    for (const l of (lotes as Row[] | null) || []) {
      const pid = String(l.product_id)
      const neto = N(l.stock_disponible) - N(l.stock_reservado) - N(l.stock_retenido) - N(l.stock_bloqueado)
      netoByProd.set(pid, (netoByProd.get(pid) ?? 0) + neto)
    }

    const issues: Issue[] = []
    for (const p of (prods as Row[] | null) || []) {
      const pid = String(p.id)
      const neto = netoByProd.get(pid) ?? 0
      const min = N(p.stock_min)
      if (neto <= 0) issues.push({ tipo: 'quiebre_stock', prioridad: 'critica', area: 'Compras', titulo: `Quiebre de stock: ${String(p.nombre)}`, mensaje: `Stock neto ${neto}. Sin disponibilidad.`, accion_sugerida: 'Generar solicitud de compra', clave: `stock:${pid}`, suena: true, ref_tipo: 'producto', ref_id: pid, estado: 'nueva' })
      else if (neto < min) issues.push({ tipo: 'stock_bajo', prioridad: 'alta', area: 'Compras', titulo: `Stock bajo: ${String(p.nombre)}`, mensaje: `Neto ${neto} < mínimo ${min}.`, accion_sugerida: 'Revisar reposición', clave: `stock:${pid}`, suena: true, ref_tipo: 'producto', ref_id: pid, estado: 'nueva' })
    }
    const hoy = Date.now(); const en7 = hoy + 7 * 86400000
    for (const l of (lotes as Row[] | null) || []) {
      const nom = String((l.producto as Row)?.nombre || '')
      if (l.fecha_vencimiento && new Date(String(l.fecha_vencimiento)).getTime() <= en7 && !['agotado', 'vencido'].includes(String(l.estado))) {
        issues.push({ tipo: 'por_vencer', prioridad: 'media', area: 'Producción', titulo: `Por vencer: ${nom}`, mensaje: `Lote ${String(l.lote_codigo) || ''} próximo a vencer (FEFO).`, accion_sugerida: 'Priorizar consumo/despacho', clave: `vencer:${String(l.id)}`, suena: false, ref_tipo: 'lote', ref_id: String(l.id), estado: 'nueva' })
      }
      if (String(l.estado) === 'bloqueado') issues.push({ tipo: 'lote_bloqueado', prioridad: 'alta', area: 'Calidad', titulo: `Lote bloqueado: ${nom}`, mensaje: `Lote ${String(l.lote_codigo) || ''} bloqueado.`, accion_sugerida: 'Revisar calidad', clave: `bloq:${String(l.id)}`, suena: true, ref_tipo: 'lote', ref_id: String(l.id), estado: 'nueva' })
      else if (String(l.estado) === 'retenido') issues.push({ tipo: 'lote_retenido', prioridad: 'media', area: 'Calidad', titulo: `Lote retenido: ${nom}`, mensaje: `Lote ${String(l.lote_codigo) || ''} retenido.`, accion_sugerida: 'Resolver retención', clave: `reten:${String(l.id)}`, suena: false, ref_tipo: 'lote', ref_id: String(l.id), estado: 'nueva' })
    }

    if (issues.length === 0) return NextResponse.json({ ok: true, nuevas: 0 })
    const claves = issues.map(i => i.clave)
    const { data: existing } = await db.from('notificaciones').select('clave').in('clave', claves).neq('estado', 'resuelta')
    const have = new Set(((existing as Row[] | null) || []).map(e => String(e.clave)))
    const toInsert = issues.filter(i => !have.has(i.clave))
    if (toInsert.length) await db.from('notificaciones').insert(toInsert)
    return NextResponse.json({ ok: true, nuevas: toInsert.length })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
