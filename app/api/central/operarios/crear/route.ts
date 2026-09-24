import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia']
const ROLES_OPERARIO = ['Operario', 'Armado']

function slug(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 24) || 'operario'
}
function genPass() {
  // Clave simple y legible para entregar al trabajador (ej. nomma8421)
  return 'nomma' + Math.floor(1000 + Math.random() * 9000)
}

// POST /api/central/operarios/crear
// Crea un trabajador completo: usuario Auth + rol en profiles + registro en operarios.
// Devuelve las credenciales para entregárselas al trabajador.
export async function POST(req: NextRequest) {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()
  const { data: me } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!ADMIN_ROLES.includes(String(me?.role || ''))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const b = await req.json().catch(() => ({}))
  const nombre = String(b.nombre || '').trim()
  if (!nombre) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 })
  const rol = ROLES_OPERARIO.includes(String(b.rol)) ? String(b.rol) : 'Operario'
  const area = b.area ? String(b.area).trim() : null
  const turno = b.turno ? String(b.turno).trim() : null
  const email = (b.email ? String(b.email).trim() : `${slug(nombre)}@operario.nomafood.cl`).toLowerCase()
  const password = b.password ? String(b.password) : genPass()

  // 1) Crear el usuario en Supabase Auth (confirmado, listo para entrar)
  const { data: created, error: cErr } = await db.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: nombre },
  })
  if (cErr || !created?.user) {
    const dup = String(cErr?.message || '').toLowerCase().includes('already')
    return NextResponse.json({ error: dup ? 'Ya existe un usuario con ese correo.' : ('No se pudo crear el usuario. ' + (cErr?.message || '')) }, { status: 400 })
  }
  const uid = created.user.id

  // 2) Rol y nombre en profiles (upsert por si el trigger ya creó la fila)
  await db.from('profiles').upsert({ id: uid, role: rol, full_name: nombre, email }, { onConflict: 'id' })

  // 3) Registro como operario
  const { error: opErr } = await db.from('operarios')
    .upsert({ profile_id: uid, area, turno_default: turno, activo: true }, { onConflict: 'profile_id' })
  if (opErr) {
    // Revertir el usuario para no dejar basura si falla el registro de operario
    await db.auth.admin.deleteUser(uid).catch(() => {})
    return NextResponse.json({ error: 'No se pudo registrar el operario. ' + opErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, nombre, email, password, rol, area, turno })
}
