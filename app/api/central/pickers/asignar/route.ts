import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion', 'Comercial']

// POST /api/central/pickers/asignar
// { pedido_id, picker_id }  → asigna (o reasigna) un pedido a un picker.
// { pedido_id, picker_id: null } → desasigna.
export async function POST(req: NextRequest) {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()
  const { data: me } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!ADMIN_ROLES.includes(String(me?.role || ''))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const pedidoId = String(b.pedido_id || '')
  if (!pedidoId) return NextResponse.json({ error: 'Falta el pedido' }, { status: 400 })
  const pickerId = b.picker_id ? String(b.picker_id) : null

  const { error } = await db.from('mayorista_pedidos')
    .update({ picker_id: pickerId, estado_armado: pickerId ? 'asignado' : 'sin_asignar' })
    .eq('id', pedidoId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
