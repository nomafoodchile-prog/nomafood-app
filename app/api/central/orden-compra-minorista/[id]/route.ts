import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion', 'Comercial']

// GET /api/central/orden-compra-minorista/[id]
// Datos para la Orden de Compra imprimible de un pedido MINORISTA (retail).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!CENTRAL_ROLES.includes(String(profile?.role || ''))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { data: pedido } = await db
    .from('minorista_pedidos')
    .select('id, numero, wc_order_id, marca, estado, metodo_pago, created_at, cliente_nombre, cliente_email, cliente_telefono, despacho_direccion, despacho_comuna, despacho_region, despacho_ciudad, subtotal, envio, iva, total, notas')
    .eq('id', params.id)
    .maybeSingle()
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

  const { data: items } = await db
    .from('minorista_pedido_items')
    .select('producto_nombre, producto_sku, cantidad, precio')
    .eq('pedido_id', pedido.id)

  return NextResponse.json({ pedido, items: items || [] })
}
