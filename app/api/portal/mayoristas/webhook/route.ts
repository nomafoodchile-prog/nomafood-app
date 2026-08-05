import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Valida la firma HMAC de Mercado Pago (x-signature). Solo se EXIGE si está
// configurado MERCADO_PAGO_WEBHOOK_SECRET; si no, no bloquea (compatibilidad).
function firmaValida(req: NextRequest, dataId: string | null): boolean {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET
  if (!secret) return true // sin secreto configurado → no se exige firma (aún)

  const xSignature = req.headers.get('x-signature') || ''
  const xRequestId = req.headers.get('x-request-id') || ''
  let ts = '', v1 = ''
  for (const part of xSignature.split(',')) {
    const [k, val] = part.split('=').map(s => s.trim())
    if (k === 'ts') ts = val
    if (k === 'v1') v1 = val
  }
  if (!ts || !v1 || !dataId) return false

  // MP: para ids alfanuméricos se usa en minúscula
  const id = /[a-z]/i.test(dataId) ? dataId.toLowerCase() : dataId
  const manifest = `id:${id};request-id:${xRequestId};ts:${ts};`
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(v1))
  } catch {
    return false
  }
}

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

    // Seguridad A4: rechaza webhooks con firma inválida (solo si hay secreto configurado)
    if (!firmaValida(req, paymentId ? String(paymentId) : null)) {
      console.warn('[mayoristas/webhook] firma inválida — rechazado')
      return NextResponse.json({ error: 'firma inválida' }, { status: 401 })
    }

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
      pending:      'pendiente_pago',
      in_process:   'pendiente_pago',
      rejected:     'cancelado',
      cancelled:    'cancelado',
      refunded:     'cancelado',
    }
    const nuevoEstado = estadoMap[payment.status] || 'pendiente_pago'

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
