import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/portal/mayoristas/[token]/pagar  body: { pedido_id }
// Devuelve el link de pago del pedido. Si no existe (la pasarela falló al crear),
// lo REGENERA al vuelo. Así el cliente siempre puede completar el pago.
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const db = createServerClient()
  const body = await req.json().catch(() => ({}))
  const pedidoId = String(body.pedido_id || '')
  if (!pedidoId) return NextResponse.json({ error: 'Falta el pedido' }, { status: 400 })

  // Validar dueño del token
  const { data: may } = await db.from('mayoristas')
    .select('id, nombre, email, token').eq('token', params.token).eq('activo', true).maybeSingle()
  if (!may) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // El pedido debe ser de este mayorista
  const { data: pedido } = await db.from('mayorista_pedidos')
    .select('id, mayorista_id, estado, despacho, iva, mp_init_point')
    .eq('id', pedidoId).eq('mayorista_id', may.id).maybeSingle()
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  if (pedido.estado === 'pagado') return NextResponse.json({ error: 'Este pedido ya está pagado.' }, { status: 400 })

  // Si ya tiene link, lo devolvemos
  if (pedido.mp_init_point) return NextResponse.json({ ok: true, init_point: pedido.mp_init_point })

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) return NextResponse.json({ error: 'Pago no disponible por ahora.' }, { status: 500 })

  const { data: items } = await db.from('mayorista_pedido_items')
    .select('producto_id, producto_sku, producto_nombre, cantidad, precio_final')
    .eq('pedido_id', pedidoId)

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
  const mpItems: any[] = (items || []).map(it => ({
    id: it.producto_id || it.producto_sku || 'prod',
    title: it.producto_nombre,
    quantity: Number(it.cantidad),
    unit_price: Number(it.precio_final),
    currency_id: 'CLP',
  }))
  if (Number(pedido.despacho) > 0) mpItems.push({ id: 'despacho', title: 'Despacho (RM)', quantity: 1, unit_price: Number(pedido.despacho), currency_id: 'CLP' })
  if (Number(pedido.iva) > 0) mpItems.push({ id: 'iva-19', title: 'IVA 19%', quantity: 1, unit_price: Number(pedido.iva), currency_id: 'CLP' })

  try {
    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: mpItems,
        payer: { name: may.nombre, email: may.email || '' },
        external_reference: pedido.id,
        statement_descriptor: 'NOMMA FOOD',
        back_urls: {
          success: `${baseUrl}/portal/mayoristas/${params.token}/confirmacion?pedido=${pedido.id}&status=success`,
          failure: `${baseUrl}/portal/mayoristas/${params.token}/confirmacion?pedido=${pedido.id}&status=failure`,
          pending: `${baseUrl}/portal/mayoristas/${params.token}/confirmacion?pedido=${pedido.id}&status=pending`,
        },
        auto_return: 'approved',
        notification_url: `${baseUrl}/api/portal/mayoristas/webhook`,
      }),
    })
    if (!mpRes.ok) return NextResponse.json({ error: 'No se pudo generar el pago. Intenta de nuevo.' }, { status: 502 })
    const mpData = await mpRes.json()
    await db.from('mayorista_pedidos').update({ mp_preference_id: mpData.id, mp_init_point: mpData.init_point }).eq('id', pedidoId)
    return NextResponse.json({ ok: true, init_point: mpData.init_point })
  } catch {
    return NextResponse.json({ error: 'Error al generar el pago.' }, { status: 500 })
  }
}
