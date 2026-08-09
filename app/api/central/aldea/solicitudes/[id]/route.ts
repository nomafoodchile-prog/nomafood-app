import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']
const ESTADOS = ['solicitud_enviada', 'en_revision', 'aprobada', 'en_preparacion', 'en_picking', 'listo_despacho', 'en_ruta', 'entregada', 'entregada_diferencias', 'cancelada']

async function esAdmin(): Promise<boolean> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return false
  const { data: p } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  return CENTRAL_ROLES.includes(String(p?.role || ''))
}

const num = (v: any) => (v === '' || v == null) ? null : Number(v)

// PATCH /api/central/aldea/solicitudes/[id]
// body: { estado?, items?: [{ id, cantidad_aprobada?, cantidad_preparada?, cantidad_despachada? }] }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const id = params.id
  const body = await req.json()

  // Actualizar líneas (cantidades que llena la Central)
  if (Array.isArray(body.items)) {
    for (const it of body.items) {
      if (!it.id) continue
      const patch: Record<string, any> = {}
      if ('cantidad_aprobada' in it) patch.cantidad_aprobada = num(it.cantidad_aprobada)
      if ('cantidad_preparada' in it) patch.cantidad_preparada = num(it.cantidad_preparada)
      if ('cantidad_despachada' in it) patch.cantidad_despachada = num(it.cantidad_despachada)
      if (Object.keys(patch).length) await db.from('aldea_solicitud_items').update(patch).eq('id', it.id).eq('solicitud_id', id)
    }
  }

  // Cambiar estado + datos de despacho (chofer)
  const upd: Record<string, any> = { updated_at: new Date().toISOString() }
  if (body.estado && ESTADOS.includes(String(body.estado))) upd.estado = body.estado
  if ('chofer_nombre' in body) upd.chofer_nombre = body.chofer_nombre ? String(body.chofer_nombre).trim() : null
  if ('chofer_telefono' in body) upd.chofer_telefono = body.chofer_telefono ? String(body.chofer_telefono).trim() : null
  if ('hora_estimada' in body) upd.hora_estimada = body.hora_estimada ? String(body.hora_estimada).trim() : null
  const { error } = await db.from('aldea_solicitudes').update(upd).eq('id', id)
  if (error) return NextResponse.json({ error: 'No se pudo guardar.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
