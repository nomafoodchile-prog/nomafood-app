import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
type Row = Record<string, unknown>

// Estados abiertos: no se regenera solicitud para un proveedor que ya tiene una viva
const ABIERTOS = ['sugerida', 'en_revision', 'aprobada']
const TRANSICIONES = ['en_revision', 'aprobada', 'comprada', 'recibida', 'cancelada']

async function getAuth() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return null
  const { data: p } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = (p?.role as string | undefined) || ''
  return CENTRAL_ROLES.includes(role) ? { id: user.id, email: user.email ?? null, role } : null
}

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: Row = {}
  try { body = await req.json() as Row } catch { /* sin body */ }
  const action = String(body.action || '')
  const db = createServerClient()

  // ── Cambiar estado de una solicitud ──────────────────────────────
  if (action === 'estado') {
    const id = String(body.id || '')
    const estado = String(body.estado || '')
    if (!id || !TRANSICIONES.includes(estado)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    const { error } = await db.from('solicitudes_compra')
      .update({ estado, usuario_id: auth.id, usuario_email: auth.email, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── Generar solicitudes sugeridas (agrupadas por proveedor) ──────
  if (action === 'generar') {
    const { data: prods } = await db.from('products')
      .select('id, nombre, stock_min, punto_reposicion, unidad_inventario')
      .not('stock_min', 'is', null)
    const { data: lotes } = await db.from('inventario_lotes')
      .select('product_id, stock_disponible, stock_reservado, stock_retenido, stock_bloqueado')

    // Stock neto por producto
    const neto = new Map<string, number>()
    for (const l of (lotes as Row[] | null) || []) {
      const pid = String(l.product_id)
      const n = N(l.stock_disponible) - N(l.stock_reservado) - N(l.stock_retenido) - N(l.stock_bloqueado)
      neto.set(pid, (neto.get(pid) ?? 0) + n)
    }

    // Proveedor principal por producto
    const { data: pps } = await db.from('proveedor_productos')
      .select('product_id, proveedor_id, unidad_compra, equivalencia_inventario, ultimo_precio, precio_referencial, proveedor:proveedores(id, nombre, estado)')
      .eq('es_principal', true)
    const principalByProd = new Map<string, Row>()
    for (const pp of (pps as Row[] | null) || []) principalByProd.set(String(pp.product_id), pp)

    // Detecta productos bajo punto de reposición y agrupa por proveedor
    interface Item { product_id: string; nombre: string; stock_actual: number; stock_min: number; punto_reposicion: number; cantidad_sugerida: number; unidad_compra: string | null; precio_unitario: number | null }
    const grupos = new Map<string, { proveedor: Row; items: Item[]; hayQuiebre: boolean }>()
    const sinProveedor: string[] = []

    for (const p of (prods as Row[] | null) || []) {
      const pid = String(p.id)
      const disponible = neto.get(pid) ?? 0
      const min = N(p.stock_min)
      const target = p.punto_reposicion != null ? N(p.punto_reposicion) : min
      if (disponible >= target) continue // no necesita reposición

      const pp = principalByProd.get(pid)
      if (!pp) { sinProveedor.push(String(p.nombre)); continue }
      const prov = (pp.proveedor as Row) || {}
      if (String(prov.estado) === 'bloqueado' || String(prov.estado) === 'archivado') { sinProveedor.push(String(p.nombre)); continue }

      const provId = String(pp.proveedor_id)
      const faltaInv = Math.max(0, target - disponible)
      const equiv = N(pp.equivalencia_inventario)
      const sugerida = equiv > 0 ? Math.ceil(faltaInv / equiv) : Math.ceil(faltaInv)
      const precio = pp.ultimo_precio != null ? N(pp.ultimo_precio) : (pp.precio_referencial != null ? N(pp.precio_referencial) : null)

      if (!grupos.has(provId)) grupos.set(provId, { proveedor: prov, items: [], hayQuiebre: false })
      const g = grupos.get(provId)!
      g.items.push({ product_id: pid, nombre: String(p.nombre), stock_actual: disponible, stock_min: min, punto_reposicion: target, cantidad_sugerida: sugerida, unidad_compra: (pp.unidad_compra as string) || null, precio_unitario: precio })
      if (disponible <= 0) g.hayQuiebre = true
    }

    if (grupos.size === 0) return NextResponse.json({ ok: true, creadas: 0, omitidas: 0, sin_proveedor: sinProveedor })

    // No duplicar: omite proveedores con solicitud abierta
    const provIds = [...grupos.keys()]
    const { data: abiertas } = await db.from('solicitudes_compra')
      .select('proveedor_id').in('proveedor_id', provIds).in('estado', ABIERTOS)
    const yaAbiertas = new Set(((abiertas as Row[] | null) || []).map(a => String(a.proveedor_id)))

    // Correlativo base
    const { count } = await db.from('solicitudes_compra').select('id', { count: 'exact', head: true })
    let seq = (count ?? 0)

    let creadas = 0, omitidas = 0
    for (const [provId, g] of grupos) {
      if (yaAbiertas.has(provId)) { omitidas++; continue }
      seq++
      const numero = 'SC-' + String(seq).padStart(6, '0')
      const { data: sol, error } = await db.from('solicitudes_compra').insert({
        numero, proveedor_id: provId, estado: 'sugerida',
        prioridad: g.hayQuiebre ? 'alta' : 'media',
        motivo: 'Generada automáticamente por stock bajo el punto de reposición',
        usuario_id: auth.id, usuario_email: auth.email,
      }).select('id').single()
      if (error || !sol) { omitidas++; continue }
      await db.from('solicitud_compra_items').insert(g.items.map(it => ({
        solicitud_id: sol.id, product_id: it.product_id,
        stock_actual: it.stock_actual, stock_min: it.stock_min, punto_reposicion: it.punto_reposicion,
        cantidad_sugerida: it.cantidad_sugerida, unidad_compra: it.unidad_compra, precio_unitario: it.precio_unitario,
      })))
      creadas++
    }

    return NextResponse.json({ ok: true, creadas, omitidas, sin_proveedor: sinProveedor })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
