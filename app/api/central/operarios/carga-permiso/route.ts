import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { idsAutorizados, guardarAutorizados } from '@/lib/central/carga-permiso'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia']

async function esAdmin(db: ReturnType<typeof createServerClient>): Promise<boolean> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return false
  const { data: p } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return ADMIN_ROLES.includes(String(p?.role || ''))
}

// GET → lista de profile_id autorizados a cargar datos
export async function GET() {
  const db = createServerClient()
  if (!(await esAdmin(db))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  return NextResponse.json({ ids: await idsAutorizados(db) })
}

// POST { profile_id, permitido } → activa/desactiva a un trabajador
export async function POST(req: NextRequest) {
  const db = createServerClient()
  if (!(await esAdmin(db))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  let body: Record<string, unknown> = {}
  try { body = await req.json() as Record<string, unknown> } catch { /* sin body */ }
  const pid = String(body.profile_id || '')
  if (!pid) return NextResponse.json({ error: 'Falta el trabajador' }, { status: 400 })
  const permitido = Boolean(body.permitido)
  const actuales = await idsAutorizados(db)
  const nuevos = permitido ? [...actuales, pid] : actuales.filter(x => x !== pid)
  try {
    await guardarAutorizados(db, nuevos)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No se pudo guardar.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, ids: Array.from(new Set(nuevos)) })
}
