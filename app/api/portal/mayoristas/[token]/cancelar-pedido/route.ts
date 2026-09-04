import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST { pedido_id } — Marca como CANCELADO un pedido del cliente aún no pagado
// (usado por "Modificar pedido": el cliente reabre sus productos en el carrito).
// IMPORTANTE: NO se borra la fila. Antes se hacía DELETE y eso hacía "desaparecer"
// pedidos por transferencia que el cliente YA había pagado (llegaba la plata pero
// el pedido no quedaba en ninguna parte). Ahora queda como 'cancelado' → siempre
// hay traza y nada se pierde.
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

  // Cancelación SUAVE: no se borra la fila (así nunca "desaparece" un pedido).
  const { error } = await db
    .from('mayorista_pedidos')
    .update({ estado: 'cancelado', estado_updated_at: new Date().toISOString() })
    .eq('id', pedidoId)
  if (error) return NextResponse.json({ error: 'No se pudo modificar el pedido.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
