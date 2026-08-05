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

// PATCH /api/central/pedidos/[id] → actualiza la fecha de entrega (despacho)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const id = params.id
  if (!id) return NextResponse.json({ error: 'Falta el pedido' }, { status: 400 })
  const body = await req.json()
  const fecha = body.fecha_entrega_req ? String(body.fecha_entrega_req) : null

  const { error } = await db.from('mayorista_pedidos').update({ fecha_entrega_req: fecha }).eq('id', id)
  if (error) return NextResponse.json({ error: 'No se pudo guardar la fecha.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/central/pedidos/[id] → elimina un pedido y sus líneas
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const id = params.id
  if (!id) return NextResponse.json({ error: 'Falta el pedido' }, { status: 400 })

  // Protección: no permitir eliminar pedidos pagados o ya en curso de despacho
  const PROTEGIDOS = ['pagado', 'en_preparacion', 'listo_para_despacho', 'asignado', 'entregado']
  const { data: ped } = await db.from('mayorista_pedidos').select('estado').eq('id', id).maybeSingle()
  if (ped && PROTEGIDOS.includes(String(ped.estado))) {
    return NextResponse.json({ error: 'No se puede eliminar un pedido pagado o en preparación. Si necesitas anularlo, cámbialo a Cancelado primero.' }, { status: 409 })
  }

  await db.from('mayorista_pedido_items').delete().eq('pedido_id', id)
  const { error } = await db.from('mayorista_pedidos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'No se pudo eliminar el pedido.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
