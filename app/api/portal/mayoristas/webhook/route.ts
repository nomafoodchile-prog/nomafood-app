import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// POST /api/portal/mayoristas/webhook
// Recibe notificaciones de Mercado Pago y actualiza el estado del pedido
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

    // Solo procesar notificaciones de pago
    if (body.type !== 'payment' || !body.data?.id) {
      return NextResponse.json({ ok: true })
    }

    // Consultar estado del pago en MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${body.data.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!mpRes.ok) return NextResponse.json({ ok: true })

    const payment = await mpRes.json()
    const pedidoId = payment.external_reference
    if (!pedidoId) return NextResponse.json({ ok: true })

    const supabase = createServerClient()

    // Mapear estado MP → estado pedido
    const estadoMap: Record<string, string> = {
      approved:     'pagado',
      pending:      'confirmado',
      in_process:   'confirmado',
      rejected:     'cancelado',
      cancelled:    'cancelado',
      refunded:     'cancelado',
    }
    const nuevoEstado = estadoMap[payment.status] || 'confirmado'

    await supabase
      .from('mayorista_pedidos')
      .update({
        mp_payment_id: String(payment.id),
        mp_status:     payment.status,
        estado:        nuevoEstado,
      })
      .eq('id', pedidoId)

    console.log(`[mayoristas/webhook] Pedido ${pedidoId} → ${nuevoEstado} (MP: ${payment.status})`)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[mayoristas/webhook] error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
