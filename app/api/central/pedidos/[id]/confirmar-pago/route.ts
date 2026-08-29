import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { enviarPedidoRecibido } from '@/lib/pedido-emails'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']

async function esAdmin(): Promise<boolean> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return false
  const { data: profile } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  return CENTRAL_ROLES.includes(String(profile?.role || ''))
}

// POST /api/central/pedidos/[id]/confirmar-pago
// Confirma manualmente el pago de un pedido (p. ej. transferencia recibida):
// lo marca como 'pagado' y envía al cliente el correo "recibido con éxito".
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const id = params.id

  const { data: pedido } = await db.from('mayorista_pedidos')
    .select('id, estado, numero_pedido, total, mayorista_id')
    .eq('id', id).maybeSingle()
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  if (pedido.estado !== 'pendiente_pago') {
    return NextResponse.json({ error: `El pedido ya no está pendiente de pago (estado: ${pedido.estado}).` }, { status: 409 })
  }

  const { error: upErr } = await db.from('mayorista_pedidos')
    .update({ estado: 'pagado', estado_updated_at: new Date().toISOString() })
    .eq('id', id)
  if (upErr) return NextResponse.json({ error: 'No se pudo confirmar el pago.' }, { status: 500 })

  // Correo "recibido con éxito" al cliente (best-effort, no bloquea)
  try {
    const { data: cli } = await db.from('mayoristas').select('email, nombre').eq('id', pedido.mayorista_id).maybeSingle()
    if (cli?.email) {
      await enviarPedidoRecibido({ to: String(cli.email), nombre: cli.nombre, numero: pedido.numero_pedido, total: pedido.total })
    }
  } catch (mailErr) {
    console.error('[central/confirmar-pago] correo falló:', mailErr)
  }

  return NextResponse.json({ ok: true })
}
