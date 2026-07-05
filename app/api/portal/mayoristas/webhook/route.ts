import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// POST /api/portal/mayoristas/webhook
// Recibe notificaciones de Mercado Pago y actualiza el estado del pedido
export async function POST(req: NextRequest) {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) { console.error('[mayoristas/webhook] falta MERCADO_PAGO_ACCESS_TOKEN'); return NextResponse.json({ ok: true }) }

    // Acepta ambos formatos: Webhooks modernos ({type,data}) e IPN/legacy (query params)
    let body: { type?: string; action?: string; data?: { id?: string | number } } = {}
    try { body = await req.json() } catch { /* legacy puede venir sin body */ }
    const url = new URL(req.url)
    const topic = body.type || url.searchParams.get('type') || url.searchParams.get('topic')
    const paymentId = body.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id')

    // Solo procesar notificaciones de pago
    if (topic !== 'payment' || !paymentId) {
      return NextResponse.json({ ok: true })
    }

    // Consultar estado del pago en MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
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
