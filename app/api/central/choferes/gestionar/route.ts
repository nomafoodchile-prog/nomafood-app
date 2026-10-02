import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia']

// POST /api/central/choferes/gestionar
// action: 'editar'  { profile_id, nombre?, telefono?, activo? }
// action: 'eliminar' { profile_id | email }
export async function POST(req: NextRequest) {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()
  const { data: me } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!ADMIN_ROLES.includes(String(me?.role || ''))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const action = String(b.action || '')
  let pid = String(b.profile_id || '').trim()
  if (!pid && b.email) {
    const { data: prof } = await db.from('profiles').select('id').eq('email', String(b.email).trim().toLowerCase()).maybeSingle()
    if (prof?.id) pid = String(prof.id)
  }
  if (!pid) return NextResponse.json({ error: 'Falta el chofer.' }, { status: 400 })
  if (action === 'eliminar' && pid === user.id) return NextResponse.json({ error: 'No puedes eliminarte a ti mismo.' }, { status: 400 })

  if (action === 'editar') {
    const patch: Record<string, unknown> = {}
    if (b.nombre !== undefined) patch.nombre = String(b.nombre).trim()
    if (b.telefono !== undefined) patch.telefono = b.telefono ? String(b.telefono).trim() : null
    if (b.activo !== undefined) patch.activo = Boolean(b.activo)
    if (Object.keys(patch).length) {
      const { error } = await db.from('drivers').update(patch).eq('profile_id', pid)
      if (error) return NextResponse.json({ error: 'No se pudo actualizar. ' + error.message }, { status: 500 })
    }
    if (b.nombre !== undefined) await db.from('profiles').update({ full_name: String(b.nombre).trim() }).eq('id', pid)
    return NextResponse.json({ ok: true })
  }

  if (action === 'password') {
    const nueva = 'nomma' + Math.floor(1000 + Math.random() * 9000)
    const { error } = await db.auth.admin.updateUserById(pid, { password: nueva })
    if (error) return NextResponse.json({ error: 'No se pudo resetear la contraseña. ' + error.message }, { status: 500 })
    return NextResponse.json({ ok: true, password: nueva })
  }

  if (action === 'eliminar') {
    // Ubica la ficha driver del chofer para soltar sus pedidos antes de borrar.
    const { data: drv } = await db.from('drivers').select('id').eq('profile_id', pid).maybeSingle()
    if (drv?.id) {
      await db.from('mayorista_pedidos').update({ chofer_id: null }).eq('chofer_id', drv.id)
      await db.from('drivers').delete().eq('id', drv.id)
    }
    await db.from('profiles').delete().eq('id', pid)
    await db.auth.admin.deleteUser(pid).catch(() => {})
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 })
}
