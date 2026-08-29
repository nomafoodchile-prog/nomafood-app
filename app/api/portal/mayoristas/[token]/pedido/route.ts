import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { DATOS_TRANSFERENCIA } from '@/lib/transferencia'

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

    // Interruptor global de pedidos (marcha blanca). Por defecto BLOQUEADO:
    // si la config no existe o no es 'true', no se permiten compras.
    const { data: cfgPed } = await supabase
      .from('app_config').select('valor').eq('clave', 'pedidos_habilitados').maybeSingle()
    if (cfgPed?.valor !== 'true') {
      return NextResponse.json(
        { error: 'El portal aún no está habilitado para pedidos. ¡Muy pronto podrás comprar!' },
        { status: 403 }
      )
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 })
    }

    // Validar stock disponible ANTES de crear el pedido (evita vender sin stock)
    const idsStock = body.items.map((i: any) => i.producto_id).filter(Boolean)
    if (idsStock.length) {
      const { data: stockRows } = await supabase
        .from('products')
        .select('id, nombre, stock_actual')
        .in('id', idsStock)
      const stockMap = new Map((stockRows || []).map((p: any) => [p.id, p]))
      const faltantes: string[] = []
      for (const it of body.items) {
        if (!it.producto_id) continue
        const p = stockMap.get(it.producto_id)
        const disp = p ? Number(p.stock_actual) : 0
        if (!p || disp < Number(it.cantidad)) {
          faltantes.push(`${it.producto_nombre || p?.nombre || 'Producto'} (quedan ${Math.max(0, disp)})`)
        }
      }
      if (faltantes.length) {
        return NextResponse.json(
          { error: `Sin stock suficiente: ${faltantes.join(', ')}. Ajusta las cantidades e intenta de nuevo.` },
          { status: 409 },
        )
      }
    }

    // Calcular totales
    const descPct = mayorista.descuento_pct || 0
    const items = body.items.map((item: any) => ({
      ...item,
      precio_final: Number((item.precio_lista * (1 - descPct / 100)).toFixed(2)),
    }))

    const IVA_PCT = 19
    const MINIMO_NETO = 80000   // Pedido mínimo (neto de productos)
    const DESPACHO    = 3500    // Costo de despacho RM (neto)
    const subtotal   = items.reduce((s: number, i: any) => s + i.precio_lista * i.cantidad, 0)
    const descuento  = items.reduce((s: number, i: any) => s + (i.precio_lista - i.precio_final) * i.cantidad, 0)
    const netoProd   = items.reduce((s: number, i: any) => s + i.precio_final * i.cantidad, 0)

    // Bloqueo de pedido mínimo (server-side: no se puede saltar desde el front)
    if (netoProd < MINIMO_NETO) {
      return NextResponse.json(
        { error: `El pedido mínimo es de $${MINIMO_NETO.toLocaleString('es-CL')} neto. Agrega más productos para continuar.` },
        { status: 400 }
      )
    }

    const despacho   = DESPACHO                            // $3.500 IVA incluido (monto fijo al total)
    const iva        = Math.round(netoProd * IVA_PCT / 100)  // IVA solo sobre productos
    const total      = Number((netoProd + iva + despacho).toFixed(2))  // + despacho = BRUTO a cobrar

    // Crear pedido en Supabase
    // Método de pago elegido en el checkout ('transferencia' o 'mercadopago')
    const metodoPago = body.metodo_pago === 'transferencia' ? 'transferencia' : 'mercadopago'

    const pedidoBase = {
      mayorista_id:       mayorista.id,
      estado:             'pendiente_pago', // se confirma (pagado) al aprobar MP o al confirmar la transferencia
      subtotal:           Number(subtotal.toFixed(2)),
      descuento_monto:    Number(descuento.toFixed(2)),
      neto:               Number(netoProd.toFixed(2)),
      despacho:           despacho,
      iva:                iva,
      total:              total,
      notas:              body.notas || null,
      fecha_entrega_req:  body.fecha_entrega_req || null,
      direccion_entrega:  body.direccion_entrega || null,
    }

    // Insert resiliente: si la columna metodo_pago aún no existe (SQL no corrido),
    // reintenta sin ella para no bloquear la compra.
    let { data: pedido, error: pErr } = await supabase
      .from('mayorista_pedidos')
      .insert({ ...pedidoBase, metodo_pago: metodoPago })
      .select()
      .single()
    if (pErr) {
      const retry = await supabase.from('mayorista_pedidos').insert(pedidoBase).select().single()
      pedido = retry.data; pErr = retry.error
    }

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

    // Transferencia bancaria: no se crea preferencia MP. El pedido queda
    // "pendiente_pago" hasta que NOMMA confirme la transferencia en el Central.
    if (metodoPago === 'transferencia') {
      return NextResponse.json({
        ok:            true,
        pedido_id:     pedido.id,
        numero:        pedido.numero_pedido,
        total:         pedido.total,
        metodo:        'transferencia',
        transferencia: DATOS_TRANSFERENCIA,
      })
    }

    // Crear preferencia Mercado Pago
    // Usamos el origen real de la petición para que el cliente vuelva al MISMO
    // despliegue desde el que compró (evita back_urls rotas). NEXT_PUBLIC_SITE_URL
    // solo manda si está explícitamente configurada (dominio de producción).
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN

    if (accessToken) {
      try {
        const mpItems = items.map((item: any) => ({
          id:          item.producto_id || item.producto_sku || 'prod',
          title:       item.producto_nombre,
          quantity:    Number(item.cantidad),
          unit_price:  Number(item.precio_final),   // precio neto por unidad
          currency_id: 'CLP',
        }))
        // Línea de despacho (RM)
        if (despacho > 0) {
          mpItems.push({
            id:          'despacho',
            title:       'Despacho (RM)',
            quantity:    1,
            unit_price:  despacho,
            currency_id: 'CLP',
          })
        }
        // Línea de IVA para que el cobro total sea el BRUTO (neto + IVA 19%)
        if (iva > 0) {
          mpItems.push({
            id:          'iva-19',
            title:       'IVA 19%',
            quantity:    1,
            unit_price:  iva,
            currency_id: 'CLP',
          })
        }

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
