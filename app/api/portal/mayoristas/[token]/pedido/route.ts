import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// POST /api/portal/mayoristas/[token]/pedido
// Crea un pedido y genera la preferencia de pago en Mercado Pago
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createServerClient()
    const body = await req.json()
    // body.items = [{ producto_id, producto_nombre, producto_sku, cantidad, precio_lista, unidad }]
    // body.notas, body.fecha_entrega_req, body.direccion_entrega

    // Validar mayorista
    const { data: mayorista } = await supabase
      .from('mayoristas')
      .select('id, nombre, empresa, email, descuento_pct')
      .eq('token', params.token)
      .eq('activo', true)
      .single()

    if (!mayorista) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 })
    }

    // Calcular totales
    const descPct = mayorista.descuento_pct || 0
    const items = body.items.map((item: any) => ({
      ...item,
      precio_final: Number((item.precio_lista * (1 - descPct / 100)).toFixed(2)),
    }))

    const subtotal   = items.reduce((s: number, i: any) => s + i.precio_lista * i.cantidad, 0)
    const descuento  = items.reduce((s: number, i: any) => s + (i.precio_lista - i.precio_final) * i.cantidad, 0)
    const total      = items.reduce((s: number, i: any) => s + i.precio_final * i.cantidad, 0)

    // Crear pedido en Supabase
    const { data: pedido, error: pErr } = await supabase
      .from('mayorista_pedidos')
      .insert({
        mayorista_id:       mayorista.id,
        estado:             'confirmado',
        subtotal:           Number(subtotal.toFixed(2)),
        descuento_monto:    Number(descuento.toFixed(2)),
        total:              Number(total.toFixed(2)),
        notas:              body.notas || null,
        fecha_entrega_req:  body.fecha_entrega_req || null,
        direccion_entrega:  body.direccion_entrega || null,
      })
      .select()
      .single()

    if (pErr || !pedido) throw pErr || new Error('Error al crear pedido')

    // Insertar líneas
    const lineItems = items.map((item: any) => ({
      pedido_id:       pedido.id,
      producto_id:     item.producto_id || null,
      producto_nombre: item.producto_nombre,
      producto_sku:    item.producto_sku || null,
      unidad:          item.unidad || 'un',
      cantidad:        item.cantidad,
      precio_lista:    item.precio_lista,
      precio_final:    item.precio_final,
    }))

    await supabase.from('mayorista_pedido_items').insert(lineItems)

    // Crear preferencia Mercado Pago
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nomafood-app.vercel.app'
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

    if (accessToken) {
      try {
        const mpItems = items.map((item: any) => ({
          id:          item.producto_id || item.producto_sku || 'prod',
          title:       item.producto_nombre,
          quantity:    Number(item.cantidad),
          unit_price:  Number(item.precio_final),
          currency_id: 'CLP',
        }))

        const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            items: mpItems,
            payer: {
              name:  mayorista.nombre,
              email: mayorista.email || '',
            },
            external_reference: pedido.id,
            statement_descriptor: 'NOMA FOOD',
            back_urls: {
              success: `${baseUrl}/portal/mayoristas/${params.token}/confirmacion?pedido=${pedido.id}&status=success`,
              failure: `${baseUrl}/portal/mayoristas/${params.token}/confirmacion?pedido=${pedido.id}&status=failure`,
              pending: `${baseUrl}/portal/mayoristas/${params.token}/confirmacion?pedido=${pedido.id}&status=pending`,
            },
            auto_return: 'approved',
            notification_url: `${baseUrl}/api/portal/mayoristas/webhook`,
          }),
        })

        if (mpRes.ok) {
          const mpData = await mpRes.json()
          await supabase
            .from('mayorista_pedidos')
            .update({
              mp_preference_id: mpData.id,
              mp_init_point:    mpData.init_point,
            })
            .eq('id', pedido.id)

          return NextResponse.json({
            ok:         true,
            pedido_id:  pedido.id,
            numero:     pedido.numero_pedido,
            total:      pedido.total,
            init_point: mpData.init_point,
          })
        }
      } catch (mpErr) {
        console.error('[mayoristas/pedido] MP error:', mpErr)
        // Continúa sin pago — el pedido queda creado
      }
    }

    // Sin Mercado Pago configurado: retornar pedido sin link de pago
    return NextResponse.json({
      ok:        true,
      pedido_id: pedido.id,
      numero:    pedido.numero_pedido,
      total:     pedido.total,
      init_point: null,
    })
  } catch (e) {
    console.error('[portal/mayoristas/pedido] POST error:', e)
    return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 })
  }
}
