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

    // Catálogo de productos activos con precio mayorista calculado.
    // Excluye tipos internos (insumos/materia prima) para que NO aparezcan en el portal.
    const TIPOS_INTERNOS = ['materia_prima', 'envase_insumo', 'preelaboracion']
    const { data: productos } = await supabase
      .from('products')
      .select('id, nombre, sku, precio, unidad, categoria, stock_actual, imagen_url, descripcion, tipo_producto')
      .eq('activo', true)
      .order('categoria')
      .order('nombre')

    const catalogo = (productos || [])
      .filter(p => !TIPOS_INTERNOS.includes(String((p as { tipo_producto?: string }).tipo_producto)))
      .map(p => ({
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

    // NOMMA CARD: puntos = 1,5% del neto. Disponibles = pedidos entregados;
    // Pendientes = pedidos en curso (aún no entregados). Cancelados no suman.
    // (Si aún no existen columnas neto/total, la query devuelve null → 0 puntos.)
    const { data: paraPuntos } = await supabase
      .from('mayorista_pedidos')
      .select('estado, neto, total')
      .eq('mayorista_id', mayorista.id)
      .neq('estado', 'borrador')
      .neq('estado', 'cancelado')

    const RATE = 0.015
    let puntos_disponibles = 0
    let puntos_pendientes = 0
    for (const p of paraPuntos || []) {
      const base = Number(p.neto) || Number(p.total) || 0
      const pts = Math.floor(base * RATE)
      if (p.estado === 'entregado') puntos_disponibles += pts
      else puntos_pendientes += pts
    }

    return NextResponse.json({
      mayorista: { ...mayorista, puntos_disponibles, puntos_pendientes },
      catalogo,
      pedidos: pedidos || [],
    })
  } catch (e) {
    console.error('[portal/mayoristas] GET error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
