import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']

async function esAdmin(): Promise<boolean> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return false
  const { data: p } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  return CENTRAL_ROLES.includes(String(p?.role || ''))
}

async function buscarUserPorEmail(db: any, email: string): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data) return null
    const found = data.users.find((u: any) => (u.email || '').toLowerCase() === email)
    if (found) return found.id
    if (data.users.length < 200) break
  }
  return null
}

// GET → organizaciones (con sucursales) + usuarios Aldea existentes
export async function GET() {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()

  const { data: orgs } = await db.from('organizaciones').select('id, nombre').eq('activo', true).order('nombre')
  const { data: sucs } = await db.from('mayoristas').select('id, nombre, organizacion_id').eq('es_sucursal', true).eq('activo', true)
  const organizaciones = (orgs || []).map(o => ({ ...o, sucursales: (sucs || []).filter(s => s.organizacion_id === o.id).map(s => ({ id: s.id, nombre: s.nombre })) }))

  const { data: vinc } = await db.from('mayorista_usuarios')
    .select('id, profile_id, organizacion_id, mayorista_id, rol, activo').eq('activo', true)
  const pids = [...new Set((vinc || []).map(v => v.profile_id))]
  const profMap = new Map<string, any>()
  if (pids.length) { const { data } = await db.from('profiles').select('id, email, full_name').in('id', pids); for (const p of data || []) profMap.set(p.id, p) }
  const sucMap = new Map<string, string>((sucs || []).map(s => [s.id, s.nombre]))

  const usuarios = (vinc || []).map(v => ({
    id: v.id, rol: v.rol,
    email: profMap.get(v.profile_id)?.email || '',
    nombre: profMap.get(v.profile_id)?.full_name || '',
    sucursal: v.mayorista_id ? (sucMap.get(v.mayorista_id) || '') : 'Todas',
    organizacion_id: v.organizacion_id,
  }))

  return NextResponse.json({ organizaciones, usuarios })
}

// POST → crear/vincular un usuario Aldea con contraseña
export async function POST(req: NextRequest) {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const body = await req.json()

  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const nombre = String(body.nombre || '').trim()
  const rol = body.rol === 'admin_general' ? 'admin_general' : 'encargado_local'
  const organizacion_id = String(body.organizacion_id || '')
  const mayorista_id = rol === 'encargado_local' ? String(body.mayorista_id || '') : null

  if (!email.includes('@')) return NextResponse.json({ error: 'Correo no válido.' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
  if (!organizacion_id) return NextResponse.json({ error: 'Falta la organización.' }, { status: 400 })
  if (rol === 'encargado_local' && !mayorista_id) return NextResponse.json({ error: 'Elige la sucursal del encargado.' }, { status: 400 })

  // Crear o actualizar el usuario de autenticación
  let userId: string | null = null
  const { data: created } = await db.auth.admin.createUser({ email, password, email_confirm: true })
  if (created?.user) userId = created.user.id
  else {
    userId = await buscarUserPorEmail(db, email)
    if (!userId) return NextResponse.json({ error: 'No se pudo crear ni encontrar el usuario.' }, { status: 500 })
    await db.auth.admin.updateUserById(userId, { password, email_confirm: true })
  }

  // Perfil (rol de cliente, no central). No pisa un rol existente si ya lo tiene.
  const { data: prof } = await db.from('profiles').select('id, role').eq('id', userId).maybeSingle()
  if (!prof) await db.from('profiles').insert({ id: userId, email, full_name: nombre || null, role: 'Mayorista' })
  else if (nombre) await db.from('profiles').update({ full_name: nombre }).eq('id', userId)

  // Vínculo Aldea (evita duplicados por org+sucursal)
  let yaExiste = false
  if (mayorista_id === null) {
    const { data } = await db.from('mayorista_usuarios').select('id').eq('profile_id', userId).eq('organizacion_id', organizacion_id).is('mayorista_id', null).maybeSingle()
    yaExiste = !!data
  } else {
    const { data } = await db.from('mayorista_usuarios').select('id').eq('profile_id', userId).eq('organizacion_id', organizacion_id).eq('mayorista_id', mayorista_id).maybeSingle()
    yaExiste = !!data
  }
  if (!yaExiste) {
    const { error } = await db.from('mayorista_usuarios').insert({ profile_id: userId, organizacion_id, mayorista_id, rol })
    if (error) return NextResponse.json({ error: 'No se pudo vincular el usuario.' }, { status: 500 })
  } else {
    await db.from('mayorista_usuarios').update({ rol, activo: true }).eq('profile_id', userId).eq('organizacion_id', organizacion_id)
  }

  return NextResponse.json({ ok: true, email })
}
