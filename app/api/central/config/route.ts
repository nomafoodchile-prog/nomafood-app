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

// GET → estado del interruptor de pedidos (marcha blanca)
export async function GET() {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const { data } = await db.from('app_config').select('valor').eq('clave', 'pedidos_habilitados').maybeSingle()
  return NextResponse.json({ pedidos_habilitados: data?.valor === 'true' })
}

// POST → prender/apagar los pedidos
export async function POST(req: NextRequest) {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const body = await req.json()
  const valor = body.habilitado ? 'true' : 'false'

  const { error } = await db.from('app_config').upsert({ clave: 'pedidos_habilitados', valor }, { onConflict: 'clave' })
  if (error) return NextResponse.json({ error: 'No se pudo guardar. ¿Existe la tabla app_config?' }, { status: 500 })
  return NextResponse.json({ ok: true, pedidos_habilitados: body.habilitado === true })
}
