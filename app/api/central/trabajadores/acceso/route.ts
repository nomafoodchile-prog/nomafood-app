import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia']

function genPass() { return 'nomma' + Math.floor(1000 + Math.random() * 9000) }

async function requireAdmin() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return { error: 'No autenticado', status: 401 as const }
  const db = createServerClient()
  const { data: me } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!ADMIN_ROLES.includes(String(me?.role || ''))) return { error: 'No autorizado', status: 403 as const }
  return { db }
}

// GET — diagnóstico: por cada trabajador (operario/chofer) dice si tiene login (auth), su email y si está confirmado.
export async function GET() {
  const g = await requireAdmin()
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const { db } = g

  const { data: ops } = await db.from('operarios').select('profile_id, area')
  const { data: drs } = await db.from('drivers').select('profile_id, nombre')
  const pids = new Set<string>()
  ;(ops || []).forEach(o => o.profile_id && pids.add(String(o.profile_id)))
  ;(drs || []).forEach(d => d.profile_id && pids.add(String(d.profile_id)))

  const { data: profs } = await db.from('profiles').select('id, full_name, email, role').in('id', Array.from(pids))
  const out: Array<Record<string, unknown>> = []
  for (const pid of pids) {
    const pr = (profs || []).find(p => String(p.id) === pid)
    let authExiste = false, confirmado = false, authEmail = ''
    try {
      const { data: u } = await db.auth.admin.getUserById(pid)
      if (u?.user) { authExiste = true; authEmail = u.user.email || ''; confirmado = !!u.user.email_confirmed_at }
    } catch { /* ignora */ }
    out.push({
      profile_id: pid, nombre: pr?.full_name || '', email: pr?.email || authEmail, rol: pr?.role || '',
      auth_existe: authExiste, confirmado, auth_email: authEmail,
    })
  }
  return NextResponse.json({ trabajadores: out })
}

// POST { profile_id, password? } — restablece la contraseña del trabajador y lo deja confirmado.
// Devuelve la contraseña nueva para entregársela.
export async function POST(req: NextRequest) {
  const g = await requireAdmin()
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const { db } = g

  const b = await req.json().catch(() => ({}))
  const pid = String(b.profile_id || '').trim()
  if (!pid) return NextResponse.json({ error: 'Falta el trabajador.' }, { status: 400 })
  const password = b.password ? String(b.password) : genPass()

  const { data: prof } = await db.from('profiles').select('email').eq('id', pid).maybeSingle()

  const { error } = await db.auth.admin.updateUserById(pid, { password, email_confirm: true })
  if (error) return NextResponse.json({ error: 'No se pudo restablecer: ' + error.message }, { status: 500 })

  return NextResponse.json({ ok: true, email: prof?.email || '', password })
}
