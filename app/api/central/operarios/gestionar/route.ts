import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia']

// POST /api/central/operarios/gestionar
// action: 'editar'  { profile_id, nombre?, area?, turno?, activo? }
// action: 'eliminar' { profile_id }  → borra operario + login + su historial vacío
export async function POST(req: NextRequest) {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()
  const { data: me } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!ADMIN_ROLES.includes(String(me?.role || ''))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const b = await req.json().catch(() => ({}))
  const action = String(b.action || '')
  let pid = String(b.profile_id || '').trim()
  // Permite ubicar al operario por email (útil cuando no se tiene el UUID a mano)
  if (!pid && b.email) {
    const { data: prof } = await db.from('profiles').select('id').eq('email', String(b.email).trim().toLowerCase()).maybeSingle()
    if (prof?.id) pid = String(prof.id)
  }
  if (!pid) return NextResponse.json({ error: 'Falta el operario.' }, { status: 400 })

  // No permitir que un admin se elimine/edite a sí mismo por error
  if (action === 'eliminar' && pid === user.id) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo.' }, { status: 400 })
  }

  if (action === 'editar') {
    const patch: Record<string, unknown> = {}
    if (b.area !== undefined) patch.area = b.area ? String(b.area).trim() : null
    if (b.turno !== undefined) patch.turno_default = b.turno ? String(b.turno).trim() : null
    if (b.activo !== undefined) patch.activo = Boolean(b.activo)
    if (Object.keys(patch).length) {
      const { error } = await db.from('operarios').update(patch).eq('profile_id', pid)
      if (error) return NextResponse.json({ error: 'No se pudo actualizar. ' + error.message }, { status: 500 })
    }
    if (b.nombre !== undefined) {
      const nombre = String(b.nombre).trim()
      if (nombre) await db.from('profiles').update({ full_name: nombre }).eq('id', pid)
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'eliminar') {
    // Si es picker: libera sus pedidos (picker_id → null) y reinicia su armado,
    // para no dejar referencias colgando ni pedidos marcados por un usuario borrado.
    const { data: asignados } = await db.from('mayorista_pedidos').select('id').eq('picker_id', pid)
    if (asignados && asignados.length) {
      const ids = asignados.map(r => r.id)
      await db.from('mayorista_pedidos').update({ picker_id: null, estado_armado: 'sin_asignar' }).in('id', ids)
      await db.from('mayorista_pedido_items').update({ pickeado: false, cantidad_pickeada: null }).in('pedido_id', ids)
    }
    // Borra el historial operativo del trabajador (por profile_id) para no dejar FKs colgando,
    // luego el registro de operario, el perfil y por último el usuario de Auth (login).
    await db.from('op_tarea_cierre').delete().eq('operario_id', pid)
    await db.from('op_tareas').delete().eq('operario_id', pid)
    await db.from('op_jornadas').delete().eq('operario_id', pid)
    const { error: opErr } = await db.from('operarios').delete().eq('profile_id', pid)
    if (opErr) return NextResponse.json({ error: 'No se pudo eliminar el operario. ' + opErr.message }, { status: 500 })
    await db.from('profiles').delete().eq('id', pid)
    await db.auth.admin.deleteUser(pid).catch(() => {})
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 })
}
