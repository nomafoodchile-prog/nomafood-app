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

// Busca un usuario de auth por email (paginando; base de clientes pequeña)
async function buscarUserPorEmail(db: ReturnType<typeof createServerClient>, email: string): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data) return null
    const found = data.users.find(u => (u.email || '').toLowerCase() === email)
    if (found) return found.id
    if (data.users.length < 200) break
  }
  return null
}

// POST /api/central/clientes/password → define/reset la contraseña de un cliente
// sin depender del correo de invitación. Deja el email confirmado para que pueda entrar.
export async function POST(req: NextRequest) {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const body = await req.json()

  const password = String(body.password || '')
  if (password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
  if (!body.mayorista_id) return NextResponse.json({ error: 'Falta el cliente.' }, { status: 400 })

  const { data: may } = await db.from('mayoristas').select('id, email, profile_id').eq('id', body.mayorista_id).maybeSingle()
  if (!may) return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 })

  const email = String(may.email || '').trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'Este cliente no tiene correo cargado. Agrégale un email primero.' }, { status: 400 })

  let userId: string | null = (may as any).profile_id || null

  // Si ya está vinculado a un usuario, solo actualizamos su clave
  if (userId) {
    const { error } = await db.auth.admin.updateUserById(userId, { password, email_confirm: true })
    if (error) return NextResponse.json({ error: 'No se pudo actualizar la contraseña.' }, { status: 500 })
  } else {
    // Intentar crear el usuario; si ya existe, buscarlo y actualizarlo
    const { data: created, error: createErr } = await db.auth.admin.createUser({ email, password, email_confirm: true })
    if (created?.user) {
      userId = created.user.id
    } else {
      userId = await buscarUserPorEmail(db, email)
      if (!userId) return NextResponse.json({ error: 'No se pudo crear ni encontrar el usuario. ' + (createErr?.message || '') }, { status: 500 })
      const { error } = await db.auth.admin.updateUserById(userId, { password, email_confirm: true })
      if (error) return NextResponse.json({ error: 'No se pudo actualizar la contraseña.' }, { status: 500 })
    }
    // Vincular la ficha del cliente con el usuario
    await db.from('mayoristas').update({ profile_id: userId }).eq('id', may.id)
  }

  return NextResponse.json({ ok: true, email })
}
