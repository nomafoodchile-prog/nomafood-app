import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const EDITAR = ['SuperAdmin', 'Administracion', 'Gerencia']
const REABRIR = ['SuperAdmin', 'Administracion']
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
const S = (v: unknown) => v === null || v === undefined ? '' : String(v)
const str = (v: unknown) => (v === '' || v === null || v === undefined) ? null : String(v)
type Row = Record<string, unknown>
const hoyCl = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())

async function getAuth() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return null
  const { data: p } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  return { id: user.id, email: user.email ?? null, role: (p?.role as string) || '' }
}

async function diaCerrado(db: ReturnType<typeof createServerClient>, fecha: string): Promise<boolean> {
  const { data } = await db.from('fin_cierres_caja').select('estado').eq('fecha', fecha).maybeSingle()
  return S(data?.estado) === 'cerrado'
}

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: Row = {}
  try { body = await req.json() as Row } catch { /* sin body */ }
  const action = String(body.action || '')
  const db = createServerClient()

  const puedeEditar = EDITAR.includes(auth.role)

  // ── Crear movimiento manual ──────────────────────────────────────
  if (action === 'crear') {
    if (!puedeEditar) return NextResponse.json({ error: 'Sin permiso para editar la caja' }, { status: 403 })
    const fecha = str(body.fecha) || hoyCl()
    if (await diaCerrado(db, fecha)) return NextResponse.json({ error: 'La caja de ese día está cerrada' }, { status: 400 })
    const tipo = String(body.tipo || '')
    if (!['ingreso', 'egreso'].includes(tipo)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    if (N(body.monto) <= 0) return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 })
    const { error } = await db.from('fin_movimientos').insert({
      fecha, tipo, categoria: str(body.categoria), descripcion: str(body.descripcion), monto: N(body.monto),
      medio: str(body.medio), origen: 'manual', estado: 'pendiente', comprobante_url: str(body.comprobante_url),
      creado_por: auth.id, creado_email: auth.email,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── Editar movimiento (con motivo, trazado) ──────────────────────
  if (action === 'editar') {
    if (!puedeEditar) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    const id = str(body.id)
    const motivo = str(body.motivo)
    if (!id || !motivo) return NextResponse.json({ error: 'Falta id o motivo del cambio' }, { status: 400 })
    const { data: mov } = await db.from('fin_movimientos').select('fecha, anulado').eq('id', id).maybeSingle()
    if (!mov) return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 })
    if ((mov as Row).anulado) return NextResponse.json({ error: 'No se puede editar un movimiento anulado' }, { status: 400 })
    if (await diaCerrado(db, S((mov as Row).fecha))) return NextResponse.json({ error: 'La caja de ese día está cerrada' }, { status: 400 })
    const patch: Row = { editado_por: auth.id, editado_email: auth.email, updated_at: new Date().toISOString(), motivo_edicion: motivo }
    for (const k of ['categoria', 'descripcion', 'medio']) if (k in body) patch[k] = str(body[k])
    if ('monto' in body) patch.monto = N(body.monto)
    const { error } = await db.from('fin_movimientos').update(patch).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── Anular movimiento (nunca eliminar) ───────────────────────────
  if (action === 'anular') {
    if (!puedeEditar) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    const id = str(body.id); const motivo = str(body.motivo)
    if (!id || !motivo) return NextResponse.json({ error: 'Falta id o motivo de anulación' }, { status: 400 })
    const { error } = await db.from('fin_movimientos').update({
      anulado: true, estado: 'anulado', anulado_por: auth.id, anulado_at: new Date().toISOString(), motivo_anulacion: motivo,
    }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── Cerrar caja del día (con arqueo) ─────────────────────────────
  if (action === 'cerrar_caja') {
    if (!puedeEditar) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    const fecha = str(body.fecha) || hoyCl()
    const { data: movs } = await db.from('fin_movimientos').select('tipo, monto, anulado').eq('fecha', fecha).eq('anulado', false)
    const lista = (movs as Row[] | null) || []
    const totalIng = lista.filter(m => S(m.tipo) === 'ingreso').reduce((a, m) => a + N(m.monto), 0)
    const totalEgr = lista.filter(m => S(m.tipo) === 'egreso').reduce((a, m) => a + N(m.monto), 0)
    const arqIng = N(body.arqueo_efectivo) + N(body.arqueo_transferencias) + N(body.arqueo_mp)
    const diferencia = (arqIng - N(body.arqueo_egresos)) - (totalIng - totalEgr)
    const { error } = await db.from('fin_cierres_caja').upsert({
      fecha, estado: 'cerrado', total_ingresos: totalIng, total_egresos: totalEgr, saldo_sistema: totalIng - totalEgr,
      arqueo_efectivo: N(body.arqueo_efectivo), arqueo_transferencias: N(body.arqueo_transferencias),
      arqueo_mp: N(body.arqueo_mp), arqueo_egresos: N(body.arqueo_egresos), diferencia,
      observaciones: str(body.observaciones), cerrado_por: auth.id, cerrado_email: auth.email, cerrado_at: new Date().toISOString(),
    }, { onConflict: 'fecha' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, diferencia })
  }

  // ── Reabrir caja (solo administrador, con motivo) ────────────────
  if (action === 'reabrir') {
    if (!REABRIR.includes(auth.role)) return NextResponse.json({ error: 'Solo un administrador puede reabrir la caja' }, { status: 403 })
    const fecha = str(body.fecha); const motivo = str(body.motivo)
    if (!fecha || !motivo) return NextResponse.json({ error: 'Falta fecha o motivo de reapertura' }, { status: 400 })
    const { error } = await db.from('fin_cierres_caja').update({
      estado: 'reabierto', reabierto_por: auth.id, reabierto_at: new Date().toISOString(), motivo_reapertura: motivo,
    }).eq('fecha', fecha)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── Sincronizar ingresos (MP) y egresos (compras) ────────────────
  if (action === 'sincronizar') {
    if (!puedeEditar) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    const { data: existentes } = await db.from('fin_movimientos').select('ref_id').not('ref_id', 'is', null)
    const yaHay = new Set(((existentes as Row[] | null) || []).map(e => S(e.ref_id)))
    const nuevos: Row[] = []

    // Ingresos: pedidos mayoristas pagados
    const { data: peds } = await db.from('mayorista_pedidos')
      .select('id, numero_pedido, total, created_at, estado, mayorista:mayoristas(nombre, empresa)')
      .eq('estado', 'pagado')
    for (const p of (peds as Row[] | null) || []) {
      if (yaHay.has(S(p.id)) || N(p.total) <= 0) continue
      const may = (p.mayorista as Row) || {}
      nuevos.push({
        fecha: S(p.created_at).slice(0, 10) || hoyCl(), tipo: 'ingreso', categoria: 'Ventas',
        descripcion: `Pedido ${S(p.numero_pedido)} · ${S(may.empresa) || S(may.nombre)}`,
        monto: N(p.total), medio: 'mercado_pago', origen: 'mercado_pago', estado: 'conciliado',
        ref_tipo: 'pedido', ref_id: S(p.id), creado_por: auth.id, creado_email: auth.email,
      })
    }

    // Egresos: recepciones de mercadería (suma de líneas)
    const { data: recs } = await db.from('recepciones').select('id, numero, created_at, proveedor:proveedores(nombre)')
    const { data: items } = await db.from('recepcion_items').select('recepcion_id, cantidad_recibida, precio_unitario')
    const montoPorRec = new Map<string, number>()
    for (const it of (items as Row[] | null) || []) {
      const rid = S(it.recepcion_id)
      montoPorRec.set(rid, (montoPorRec.get(rid) ?? 0) + N(it.cantidad_recibida) * N(it.precio_unitario))
    }
    for (const r of (recs as Row[] | null) || []) {
      const monto = montoPorRec.get(S(r.id)) ?? 0
      if (yaHay.has(S(r.id)) || monto <= 0) continue
      const prov = (r.proveedor as Row) || {}
      nuevos.push({
        fecha: S(r.created_at).slice(0, 10) || hoyCl(), tipo: 'egreso', categoria: 'Materia prima',
        descripcion: `Recepción ${S(r.numero)} · ${S(prov.nombre)}`, monto, medio: 'transferencia',
        origen: 'compra', estado: 'pendiente', ref_tipo: 'recepcion', ref_id: S(r.id),
        creado_por: auth.id, creado_email: auth.email,
      })
    }

    if (nuevos.length) {
      const { error } = await db.from('fin_movimientos').insert(nuevos)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, creados: nuevos.length })
  }

  // ── Cartola: crear (parseada) + conciliación automática ──────────
  if (action === 'cartola_crear') {
    if (!puedeEditar) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    const items = Array.isArray(body.movimientos) ? (body.movimientos as Row[]) : []
    if (items.length === 0) return NextResponse.json({ error: 'La cartola no tiene movimientos' }, { status: 400 })
    const { data: cart, error: eC } = await db.from('fin_cartolas').insert({
      banco: str(body.banco), archivo_url: str(body.archivo_url), periodo: str(body.periodo),
      total_lineas: items.length, created_by: auth.id, created_email: auth.email,
    }).select('id').single()
    if (eC || !cart) return NextResponse.json({ error: eC?.message || 'No se pudo crear la cartola' }, { status: 500 })

    // Candidatos de la Caja (no anulados) para cruzar por monto y fecha (±3 días)
    const { data: movs } = await db.from('fin_movimientos').select('id, fecha, monto, tipo').eq('anulado', false)
    const cand = ((movs as Row[] | null) || []).map(m => ({ id: S(m.id), fecha: S(m.fecha), monto: N(m.monto), tipo: S(m.tipo), usado: false }))
    const dias = (a: string, b: string) => Math.abs((new Date(a + 'T00:00:00').getTime() - new Date(b + 'T00:00:00').getTime()) / 86400000)

    let conciliados = 0
    const rows = items.map(it => {
      const monto = Math.abs(N(it.monto))
      const tipo = String(it.tipo || (N(it.monto) < 0 ? 'cargo' : 'abono'))
      const fecha = str(it.fecha)
      const tipoCaja = tipo === 'abono' ? 'ingreso' : 'egreso'
      let movId: string | null = null
      if (fecha) {
        const m = cand.find(c => !c.usado && Math.abs(c.monto - monto) < 1 && c.tipo === tipoCaja && dias(c.fecha, fecha) <= 3)
        if (m) { m.usado = true; movId = m.id; conciliados++ }
      }
      return { cartola_id: cart.id, fecha: fecha, descripcion: str(it.descripcion), monto, tipo, conciliado: !!movId, movimiento_id: movId }
    })
    const { error: eR } = await db.from('fin_cartola_movimientos').insert(rows)
    if (eR) return NextResponse.json({ error: eR.message }, { status: 500 })
    // Los movimientos de caja cruzados quedan conciliados
    const ids = rows.filter(r => r.movimiento_id).map(r => r.movimiento_id as string)
    if (ids.length) await db.from('fin_movimientos').update({ estado: 'conciliado' }).in('id', ids)
    return NextResponse.json({ ok: true, cartola_id: cart.id, total: rows.length, conciliados })
  }

  // ── Cartola: conciliación manual (con motivo) ────────────────────
  if (action === 'cartola_conciliar') {
    if (!puedeEditar) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    const id = str(body.id); const movimientoId = str(body.movimiento_id); const motivo = str(body.motivo)
    if (!id || !movimientoId || !motivo) return NextResponse.json({ error: 'Falta línea, movimiento o motivo' }, { status: 400 })
    const { error } = await db.from('fin_cartola_movimientos').update({
      conciliado: true, movimiento_id: movimientoId, motivo_conciliacion: motivo,
    }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await db.from('fin_movimientos').update({ estado: 'conciliado' }).eq('id', movimientoId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
