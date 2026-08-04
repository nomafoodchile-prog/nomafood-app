import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']

async function esAdmin(): Promise<boolean> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return false
  const { data: profile } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  return CENTRAL_ROLES.includes(String(profile?.role || ''))
}

// GET /api/central/orden-compra/[id]
// Devuelve todos los datos de un pedido para armar la orden de compra (facturación).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await esAdmin()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const db = createServerClient()

  const { data: pedido } = await db
    .from('mayorista_pedidos')
    .select('id, numero_pedido, estado, created_at, fecha_entrega_req, direccion_entrega, subtotal, descuento_monto, neto, despacho, iva, total, notas, mayorista_id')
    .eq('id', params.id)
    .maybeSingle()

  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

  const { data: items } = await db
    .from('mayorista_pedido_items')
    .select('producto_nombre, producto_sku, unidad, cantidad, precio_lista, precio_final')
    .eq('pedido_id', pedido.id)

  const { data: mayorista } = await db
    .from('mayoristas')
    .select('nombre, empresa, email, telefono, rut')
    .eq('id', pedido.mayorista_id)
    .maybeSingle()

  // Datos de facturación adicionales (dirección de facturación, comuna, giro) desde la solicitud vinculada.
  const { data: sol } = await db
    .from('access_requests')
    .select('direccion, comuna, giro, cargo')
    .eq('mayorista_id', pedido.mayorista_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    pedido,
    items: items || [],
    mayorista: mayorista || null,
    facturacion: sol || null,
  })
}
