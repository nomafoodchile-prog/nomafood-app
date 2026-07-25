import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const VER = ['SuperAdmin', 'Administracion', 'Gerencia', 'Comercial']
const ESTADOS = ['nueva', 'en_proceso', 'cotizada', 'cerrada', 'descartada']

async function getAuth() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return null
  const { data: p } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  return { role: (p?.role as string) || '' }
}

export async function GET() {
  const auth = await getAuth()
  if (!auth || !VER.includes(auth.role)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { data } = await createServerClient()
    .from('import_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
  return NextResponse.json({ ok: true, solicitudes: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth || !VER.includes(auth.role)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const id = String(body.id || '')
  const estado = String(body.estado || '')
  if (!id || !ESTADOS.includes(estado)) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const { error } = await createServerClient().from('import_requests').update({ estado }).eq('id', id)
  if (error) return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
