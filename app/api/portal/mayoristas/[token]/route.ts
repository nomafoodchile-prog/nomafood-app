import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// GET /api/portal/mayoristas/[token]
// Retorna: mayorista info + catálogo de productos + pedidos recientes
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createServerClient()

    // Validar mayorista
    const { data: mayorista, error: mErr } = await supabase
      .from('mayoristas')
      .select('id, nombre, empresa, email, telefono, rut, descuento_pct, limite_credito')
      .eq('token', params.token)
      .eq('activo', true)
      .single()

    if (mErr || !mayorista) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
    }

    // Catálogo de productos activos con precio mayorista calculado
    const { data: productos } = await supabase
      .from('products')
      .select('id, nombre, sku, precio, unidad, categoria, stock_actual, imagen_url, descripcion')
      .eq('activo', true)
      .order('categoria')
      .order('nombre')

    const catalogo = (productos || []).map(p => ({
      ...p,
      precio_lista: p.precio,
      precio_mayorista: Number((p.precio * (1 - mayorista.descuento_pct / 100)).toFixed(2)),
    }))

    // Pedidos recientes (últimos 10)
    const { data: pedidos } = await supabase
      .from('mayorista_pedidos')
      .select(`
        id, numero_pedido, estado, total, created_at, fecha_entrega_req,
        mp_status,
        items:mayorista_pedido_items(id, producto_nombre, cantidad, precio_final, unidad)
      `)
      .eq('mayorista_id', mayorista.id)
      .neq('estado', 'borrador')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({ mayorista, catalogo, pedidos: pedidos || [] })
  } catch (e) {
    console.error('[portal/mayoristas] GET error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
