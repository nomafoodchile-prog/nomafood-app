import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// El catálogo del portal (stock, precios) debe ser SIEMPRE en tiempo real:
// sin esto Next cachea la respuesta y el cliente ve stock/precios viejos.
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
      .select('id, nombre, empresa, email, telefono, rut, descuento_pct, limite_credito, marca')
      .eq('token', params.token)
      .eq('activo', true)
      .single()

    if (mErr || !mayorista) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
    }

    // Cada cliente ve SOLO el catálogo de su marca (Brotes ve Brotes, NOMMA ve NOMMA).
    const marcaCliente = (mayorista as { marca?: string }).marca || 'NOMMA FOOD'

    // Catálogo de productos activos con precio mayorista calculado.
    // Excluye tipos internos (insumos/materia prima) para que NO aparezcan en el portal.
    // El catálogo mayorista = EXACTAMENTE los productos que están en la web pública
    // de la marca (visible_catalogo = true). Así se excluyen automáticamente los
    // exclusivos de Aldea Vegetal (visible_catalogo = false) y los insumos internos.
    const TIPOS_INTERNOS = ['materia_prima', 'envase_insumo', 'preelaboracion']

    const { data: productos } = await supabase
      .from('products')
      .select('id, nombre, sku, precio, unidad, categoria, subcategoria, stock_actual, imagen_url, descripcion, tipo_producto')
      .eq('activo', true)
      .eq('marca', marcaCliente)
      .eq('visible_catalogo', true)
      .order('categoria')
      .order('subcategoria', { ascending: true, nullsFirst: false })
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
        mp_status, mp_init_point,
        items:mayorista_pedido_items(id, producto_id, producto_nombre, producto_sku, cantidad, precio_lista, precio_final, unidad)
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

    // Direcciones de despacho del cliente (self-service; se aprueban en la Central)
    const { data: direcciones } = await supabase
      .from('mayorista_direcciones')
      .select('id, alias, direccion, comuna, contacto, telefono, estado, created_at')
      .eq('mayorista_id', mayorista.id)
      .eq('activo', true)
      .order('created_at', { ascending: false })

    // Interruptor de pedidos POR MARCA (marcha blanca). Por defecto BLOQUEADO.
    // Brotes usa 'pedidos_habilitados_brotes', NOMMA 'pedidos_habilitados'.
    const claveSwitch = marcaCliente === 'Brotes Asiáticos' ? 'pedidos_habilitados_brotes' : 'pedidos_habilitados'
    const { data: cfgPed } = await supabase
      .from('app_config').select('valor').eq('clave', claveSwitch).maybeSingle()
    const pedidos_habilitados = cfgPed?.valor === 'true'

    return NextResponse.json({
      mayorista: { ...mayorista, puntos_disponibles, puntos_pendientes },
      catalogo,
      pedidos: pedidos || [],
      direcciones: direcciones || [],
      pedidos_habilitados,
    })
  } catch (e) {
    console.error('[portal/mayoristas] GET error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
