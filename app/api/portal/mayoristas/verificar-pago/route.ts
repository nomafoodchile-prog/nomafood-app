import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// POST /api/portal/mayoristas/verificar-pago
// Red de seguridad: cuando el cliente vuelve del checkout de Mercado Pago, esta
// ruta consulta el pago DIRECTO a Mercado Pago (server-to-server) y marca el
// pedido como pagado. No depende de que el webhook llegue a nuestro dominio.
export async function POST(req: NextRequest) {
  try {
    let body: { pedido_id?: string; payment_id?: string } = {}
    try { body = await req.json() } catch { /* sin body */ }

    const pedidoId = (body.pedido_id || '').trim()
    if (!pedidoId) return NextResponse.json({ error: 'Falta el pedido' }, { status: 400 })

    const supabase = createServerClient()
    const { data: pedido } = await supabase
      .from('mayorista_pedidos')
      .select('id, estado, mp_status')
      .eq('id', pedidoId)
      .maybeSingle()
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

    // Ya estaba pagado: nada que hacer
    if (pedido.estado === 'pagado') return NextResponse.json({ ok: true, estado: 'pagado', yaEstaba: true })

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) return NextResponse.json({ ok: false, estado: pedido.estado, motivo: 'sin_token' })

    // 1) Si Mercado Pago nos pasó el payment_id en la URL de vuelta, lo consultamos directo
    let payment: { id?: string | number; status?: string } | null = null
    if (body.payment_id) {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${body.payment_id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (r.ok) payment = await r.json()
    }

    // 2) Si no, buscamos por referencia externa (= id del pedido)
    if (!payment) {
      const r = await fetch(
        `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(pedidoId)}&sort=date_created&criteria=desc`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      if (r.ok) {
        const data = await r.json()
        const results: Array<{ id?: string | number; status?: string }> = data.results || []
        payment = results.find(p => p.status === 'approved') || results[0] || null
      }
    }

    if (!payment || !payment.id) {
      return NextResponse.json({ ok: false, estado: pedido.estado, motivo: 'sin_pago' })
    }

    const estadoMap: Record<string, string> = {
      approved:   'pagado',
      pending:    'confirmado',
      in_process: 'confirmado',
      rejected:   'cancelado',
      cancelled:  'cancelado',
      refunded:   'cancelado',
    }
    const nuevoEstado = estadoMap[payment.status || ''] || 'confirmado'

    await supabase
      .from('mayorista_pedidos')
      .update({ mp_payment_id: String(payment.id), mp_status: payment.status, estado: nuevoEstado })
      .eq('id', pedidoId)

    return NextResponse.json({ ok: true, estado: nuevoEstado, mp_status: payment.status })
  } catch (e) {
    console.error('[mayoristas/verificar-pago] error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
