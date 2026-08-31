import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Recibe pedidos minorista desde la web (WooCommerce) y los guarda en la Central.
// Seguridad: secreto compartido (header x-min-secret o body.secret).
export const dynamic = 'force-dynamic'
export const revalidate = 0

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const secret = process.env.MINORISTA_SYNC_SECRET || 'brotesmin2026'
    const provided = req.headers.get('x-min-secret') || (body as { secret?: string }).secret
    if (provided !== secret) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = createServerClient()
    const c = (body.cliente || {}) as Record<string, string>
    const d = (body.despacho || {}) as Record<string, string>

    const base = {
      wc_order_id:       body.wc_order_id ? Number(body.wc_order_id) : null,
      numero:            String(body.numero || body.wc_order_id || ''),
      marca:             String(body.marca || 'Brotes Asiáticos'),
      cliente_nombre:    c.nombre || null,
      cliente_email:     c.email || null,
      cliente_telefono:  c.telefono || null,
      despacho_direccion: d.direccion || null,
      despacho_comuna:   d.comuna || null,
      despacho_region:   d.region || null,
      despacho_ciudad:   d.ciudad || null,
      subtotal:          num(body.subtotal),
      envio:             num(body.envio),
      iva:               num(body.iva),
      total:             num(body.total),
      estado:            String(body.estado || 'nuevo'),
      metodo_pago:       body.metodo_pago || null,
      notas:             body.notas || null,
    }

    // Upsert por wc_order_id: si el hook se dispara varias veces, actualiza el mismo pedido.
    const { data: pedido, error } = await supabase
      .from('minorista_pedidos')
      .upsert(base, { onConflict: 'wc_order_id' })
      .select()
      .single()

    if (error || !pedido) {
      console.error('[minorista/pedido] insert error:', error)
      return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
    }

    const items = Array.isArray(body.items) ? body.items : []
    if (items.length) {
      await supabase.from('minorista_pedido_items').delete().eq('pedido_id', pedido.id)
      await supabase.from('minorista_pedido_items').insert(
        items.map((it: Record<string, unknown>) => ({
          pedido_id:       pedido.id,
          producto_nombre: it.nombre || it.producto_nombre || 'Producto',
          producto_sku:    it.sku || null,
          cantidad:        Number(it.cantidad) || 1,
          precio:          num(it.precio),
        }))
      )
    }

    return NextResponse.json({ ok: true, id: pedido.id, numero: pedido.numero })
  } catch (e) {
    console.error('[minorista/pedido] POST error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
