import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST { pedido_id } — Elimina un pedido del cliente que AÚN no ha pagado.
// Un pedido "pendiente_pago" no reserva ni descuenta stock, así que borrarlo es
// seguro. Se usa para "Modificar pedido": el cliente reabre sus productos en el
// carrito (en el front) y este endpoint borra el pedido viejo para no duplicar.
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const db = createServerClient()

  const { data: may } = await db
    .from('mayoristas')
    .select('id')
    .eq('token', params.token)
    .eq('activo', true)
    .maybeSingle()
  if (!may) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  let body: { pedido_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 }) }
  const pedidoId = body.pedido_id
  if (!pedidoId) return NextResponse.json({ error: 'Falta el pedido' }, { status: 400 })

  // Solo se puede tocar un pedido de ESTE cliente y que siga pendiente de pago.
  const { data: pedido } = await db
    .from('mayorista_pedidos')
    .select('id, estado, mayorista_id')
    .eq('id', pedidoId)
    .maybeSingle()
  if (!pedido || pedido.mayorista_id !== may.id) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }
  if (pedido.estado !== 'pendiente_pago') {
    return NextResponse.json({ error: 'Este pedido ya no se puede modificar.' }, { status: 409 })
  }

  await db.from('mayorista_pedido_items').delete().eq('pedido_id', pedidoId)
  await db.from('mayorista_pedidos').delete().eq('id', pedidoId)

  return NextResponse.json({ ok: true })
}
