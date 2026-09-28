import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/portal/armado            → lista de pedidos asignados al picker de la sesión
// GET /api/portal/armado?pedido=ID  → un pedido + sus ítems (verifica pertenencia)
export async function GET(req: NextRequest) {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()
  const pedidoId = new URL(req.url).searchParams.get('pedido')

  if (pedidoId) {
    const { data: ped } = await db.from('mayorista_pedidos')
      .select('id, numero_pedido, total, estado_armado, direccion_entrega, picker_id, mayorista:mayoristas(nombre, empresa)')
      .eq('id', pedidoId).maybeSingle()
    if (!ped || ped.picker_id !== user.id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const { data: items } = await db.from('mayorista_pedido_items')
      .select('id, producto_nombre, producto_sku, cantidad, unidad, pickeado, cantidad_pickeada')
      .eq('pedido_id', ped.id).order('producto_nombre')
    return NextResponse.json({ pedido: ped, items: items || [] })
  }

  const { data: pedidos } = await db.from('mayorista_pedidos')
    .select('id, numero_pedido, total, estado_armado, direccion_entrega, mayorista:mayoristas(nombre, empresa)')
    .eq('picker_id', user.id).order('created_at', { ascending: false })
  return NextResponse.json({ pedidos: pedidos || [] })
}

// POST /api/portal/armado
// action 'item'      { item_id, pickeado, cantidad_pickeada? } — confirma un ítem del pedido
// action 'finalizar' { pedido_id }                              — marca el pedido como armado
// Verifica SIEMPRE que el pedido esté asignado al picker de la sesión.
export async function POST(req: NextRequest) {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()

  const b = await req.json().catch(() => ({}))
  const action = String(b.action || '')

  if (action === 'item') {
    const itemId = String(b.item_id || '')
    if (!itemId) return NextResponse.json({ error: 'Falta el ítem' }, { status: 400 })
    // El ítem pertenece a un pedido; ese pedido debe estar asignado a este picker.
    const { data: item } = await db.from('mayorista_pedido_items').select('id, pedido_id').eq('id', itemId).maybeSingle()
    if (!item) return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
    const { data: ped } = await db.from('mayorista_pedidos').select('id, picker_id, estado_armado').eq('id', item.pedido_id).maybeSingle()
    if (!ped || ped.picker_id !== user.id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const patch: Record<string, unknown> = { pickeado: Boolean(b.pickeado) }
    if (b.cantidad_pickeada !== undefined && b.cantidad_pickeada !== null && b.cantidad_pickeada !== '') patch.cantidad_pickeada = Number(b.cantidad_pickeada)
    const { error } = await db.from('mayorista_pedido_items').update(patch).eq('id', itemId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Al tocar el primer ítem, el pedido pasa a "en_armado".
    if (ped.estado_armado === 'asignado') await db.from('mayorista_pedidos').update({ estado_armado: 'en_armado' }).eq('id', ped.id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'finalizar') {
    const pedidoId = String(b.pedido_id || '')
    if (!pedidoId) return NextResponse.json({ error: 'Falta el pedido' }, { status: 400 })
    const { data: ped } = await db.from('mayorista_pedidos').select('id, picker_id').eq('id', pedidoId).maybeSingle()
    if (!ped || ped.picker_id !== user.id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const { error } = await db.from('mayorista_pedidos').update({ estado_armado: 'armado' }).eq('id', pedidoId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
