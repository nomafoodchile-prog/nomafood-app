import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia']

function slug(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 24) || 'chofer'
}
function genPass() { return 'nomma' + Math.floor(1000 + Math.random() * 9000) }

async function requireAdmin() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return { error: 'No autenticado', status: 401 as const }
  const db = createServerClient()
  const { data: me } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!ADMIN_ROLES.includes(String(me?.role || ''))) return { error: 'No autorizado', status: 403 as const }
  return { db, user }
}

// GET — introspección: prueba columnas candidatas en drivers (tabla vacía) para saber el esquema.
export async function GET() {
  const g = await requireAdmin()
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const { db } = g
  const CANDIDATAS = ['id', 'profile_id', 'user_id', 'auth_id', 'nombre', 'name', 'apellido',
    'telefono', 'phone', 'email', 'correo', 'activo', 'active', 'patente', 'vehiculo', 'created_at']
  const existen: string[] = []
  for (const c of CANDIDATAS) {
    const { error } = await db.from('drivers').select(c).limit(1)
    if (!error) existen.push(c)
  }
  const { data: sample } = await db.from('drivers').select('*').limit(1)
  return NextResponse.json({ columnas_existentes: existen, muestra: sample?.[0] || null })
}

// POST — crea un chofer con login (auth) + rol Chofer + ficha en drivers.
// Se completa tras confirmar el esquema real de drivers (ver GET).
export async function POST(req: NextRequest) {
  const g = await requireAdmin()
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const { db } = g

  const b = await req.json().catch(() => ({}))
  const nombre = String(b.nombre || '').trim()
  if (!nombre) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 })
  const telefono = b.telefono ? String(b.telefono).trim() : null
  const email = (b.email ? String(b.email).trim() : `${slug(nombre)}@chofer.nomafood.cl`).toLowerCase()
  const password = b.password ? String(b.password) : genPass()

  // 1) Usuario Auth
  const { data: created, error: cErr } = await db.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: nombre },
  })
  if (cErr || !created?.user) {
    const dup = String(cErr?.message || '').toLowerCase().includes('already')
    return NextResponse.json({ error: dup ? 'Ya existe un usuario con ese correo.' : ('No se pudo crear el usuario. ' + (cErr?.message || '')) }, { status: 400 })
  }
  const uid = created.user.id

  // 2) Rol Chofer en profiles
  await db.from('profiles').upsert({ id: uid, role: 'Chofer', full_name: nombre, email }, { onConflict: 'id' })

  // 3) Ficha en drivers, vinculada al usuario (profile_id) para que el portal muestre SOLO sus entregas.
  const { error: dErr } = await db.from('drivers')
    .upsert({ profile_id: uid, nombre, telefono, activo: true }, { onConflict: 'profile_id' })
  if (dErr) {
    await db.auth.admin.deleteUser(uid).catch(() => {})
    return NextResponse.json({ error: 'No se pudo registrar el chofer. ' + dErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, nombre, email, password, telefono })
}
