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

// GET /api/central/pedidos-minorista → pedidos minorista (retail) desde la Central.
// Se lee por el servidor (service-role) para no exponer datos de clientes vía RLS
// a cualquier usuario autenticado (p.ej. clientes del portal mayorista).
export async function GET() {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const { data } = await db
    .from('minorista_pedidos')
    .select('*, items:minorista_pedido_items(*)')
    .order('created_at', { ascending: false })
    .limit(200)
  return NextResponse.json({ pedidos: data || [] })
}

// POST /api/central/pedidos-minorista → marcar un pedido minorista como pagado.
// Soluciona el desfase cuando el pedido se pagó en la web (Mercado Pago) pero la
// Central quedó en "pending" porque el aviso de cambio de estado (WooCommerce →
// Central) no llegó. Deja el pedido en "processing" (pagado), con lo que aparece
// su Orden de Compra para armarlo. Solo roles de la Central (service-role).
export async function POST(req: NextRequest) {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  let body: { id?: string; estado?: string } = {}
  try { body = await req.json() } catch { /* body vacío */ }
  const id = body.id
  if (!id) return NextResponse.json({ error: 'Falta el id del pedido' }, { status: 400 })

  // Estado destino: por defecto "processing" (pagado). Solo se permite marcar
  // pagado o cancelado desde aquí para no romper otros flujos.
  const destino = body.estado === 'cancelado' ? 'cancelado' : 'processing'

  const db = createServerClient()
  const { data, error } = await db
    .from('minorista_pedidos')
    .update({ estado: destino })
    .eq('id', id)
    .select('id, estado, wc_order_id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true, pedido: data })
}
