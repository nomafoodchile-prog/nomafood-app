import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }

async function getAuth() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return null
  const { data: p } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = (p?.role as string | undefined) || ''
  return CENTRAL_ROLES.includes(role) ? { id: user.id, email: user.email ?? null, role } : null
}

type Bal = { disp: number; res: number; ret: number; bloq: number }
// Devuelve el delta a aplicar a cada saldo según el tipo de movimiento
function delta(tipo: string, c: number): Bal | null {
  switch (tipo) {
    case 'entrada_compra': case 'entrada_produccion': case 'ajuste_positivo': return { disp: c, res: 0, ret: 0, bloq: 0 }
    case 'salida_consumo': case 'salida_venta': case 'merma': case 'ajuste_negativo': return { disp: -c, res: 0, ret: 0, bloq: 0 }
    case 'reserva': return { disp: -c, res: c, ret: 0, bloq: 0 }
    case 'liberacion_reserva': return { disp: c, res: -c, ret: 0, bloq: 0 }
    case 'retencion': return { disp: -c, res: 0, ret: c, bloq: 0 }
    case 'liberacion_calidad': return { disp: c, res: 0, ret: -c, bloq: 0 }
    case 'bloqueo': return { disp: -c, res: 0, ret: 0, bloq: c }
    case 'desbloqueo': return { disp: c, res: 0, ret: 0, bloq: -c }
    case 'traspaso': return { disp: 0, res: 0, ret: 0, bloq: 0 }
    default: return null
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: Record<string, unknown> = {}
  try { body = await req.json() as Record<string, unknown> } catch { /* sin body */ }
  const action = String(body.action || '')
  const db = createServerClient()

  if (action === 'crear_lote') {
    if (!body.product_id) return NextResponse.json({ error: 'Falta el producto' }, { status: 400 })
    const inicial = N(body.stock_inicial)
    const { data: lote, error } = await db.from('inventario_lotes').insert({
      product_id: String(body.product_id), lote_codigo: body.lote_codigo ? String(body.lote_codigo) : null,
      es_externo: Boolean(body.es_externo), fecha_elaboracion: body.fecha_elaboracion || null, fecha_vencimiento: body.fecha_vencimiento || null,
      bodega_id: body.bodega_id ? String(body.bodega_id) : null, unidad: body.unidad ? String(body.unidad) : null,
      stock_inicial: inicial, stock_disponible: inicial, estado: inicial > 0 ? 'disponible' : 'agotado', usuario_id: auth.id,
    }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (inicial > 0) {
      await db.from('inventario_movimientos').insert({ lote_id: lote.id, product_id: String(body.product_id), tipo_movimiento: 'ajuste_positivo', cantidad: inicial, unidad: body.unidad ? String(body.unidad) : null, motivo: 'Alta de lote', bodega_destino_id: body.bodega_id ? String(body.bodega_id) : null, usuario_id: auth.id, usuario_email: auth.email })
    }
    return NextResponse.json({ ok: true, lote_id: lote.id })
  }

  if (action === 'movimiento') {
    const loteId = String(body.lote_id || '')
    const tipo = String(body.tipo_movimiento || '')
    const cant = N(body.cantidad)
    const motivo = String(body.motivo || '').trim()
    if (!loteId || !tipo) return NextResponse.json({ error: 'Faltan datos del movimiento' }, { status: 400 })
    if (!motivo) return NextResponse.json({ error: 'El motivo es obligatorio' }, { status: 400 })
    if (cant <= 0 && tipo !== 'traspaso') return NextResponse.json({ error: 'La cantidad debe ser mayor a 0' }, { status: 400 })

    const d = delta(tipo, cant)
    if (!d) return NextResponse.json({ error: 'Tipo de movimiento inválido' }, { status: 400 })

    const { data: lote } = await db.from('inventario_lotes').select('*').eq('id', loteId).maybeSingle()
    if (!lote) return NextResponse.json({ error: 'Lote no encontrado' }, { status: 404 })
    const L = lote as Record<string, unknown>

    // No sacar lotes vencidos/bloqueados/retenidos sin SuperAdmin
    const salidaReal = tipo === 'salida_consumo' || tipo === 'salida_venta'
    if (salidaReal && ['vencido', 'bloqueado', 'retenido'].includes(String(L.estado)) && auth.role !== 'SuperAdmin') {
      return NextResponse.json({ error: `El lote está ${String(L.estado)}. Solo un SuperAdmin puede sacar stock de él.` }, { status: 403 })
    }

    const nuevo = {
      disp: N(L.stock_disponible) + d.disp, res: N(L.stock_reservado) + d.res,
      ret: N(L.stock_retenido) + d.ret, bloq: N(L.stock_bloqueado) + d.bloq,
    }
    // No stock negativo salvo SuperAdmin
    if ((nuevo.disp < 0 || nuevo.res < 0 || nuevo.ret < 0 || nuevo.bloq < 0) && auth.role !== 'SuperAdmin') {
      return NextResponse.json({ error: 'La operación dejaría stock negativo. Requiere permiso de SuperAdmin.' }, { status: 400 })
    }

    const totalFisico = nuevo.disp + nuevo.res + nuevo.ret + nuevo.bloq
    let estado = 'disponible'
    if (totalFisico <= 0) estado = 'agotado'
    else if (nuevo.bloq > 0) estado = 'bloqueado'
    else if (nuevo.ret > 0 && nuevo.disp <= 0) estado = 'retenido'

    const patch: Record<string, unknown> = {
      stock_disponible: nuevo.disp, stock_reservado: nuevo.res, stock_retenido: nuevo.ret,
      stock_bloqueado: nuevo.bloq, estado, updated_at: new Date().toISOString(),
    }
    if (tipo === 'traspaso' && body.bodega_destino_id) patch.bodega_id = String(body.bodega_destino_id)

    const { error: eUpd } = await db.from('inventario_lotes').update(patch).eq('id', loteId)
    if (eUpd) return NextResponse.json({ error: eUpd.message }, { status: 500 })

    await db.from('inventario_movimientos').insert({
      lote_id: loteId, product_id: L.product_id, tipo_movimiento: tipo, cantidad: cant, unidad: L.unidad,
      motivo, bodega_origen_id: L.bodega_id, bodega_destino_id: body.bodega_destino_id ? String(body.bodega_destino_id) : null,
      pedido_id: body.pedido_id ? String(body.pedido_id) : null, compra_id: body.compra_id ? String(body.compra_id) : null,
      usuario_id: auth.id, usuario_email: auth.email, observacion: body.observacion ? String(body.observacion) : null,
    })
    return NextResponse.json({ ok: true, estado })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
