import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']
const S = (v: unknown) => (v === null || v === undefined ? '' : String(v))

// GET → ids + created_at de pedidos minorista (service role, ignora RLS).
// Lo usa el badge del Sidebar para contar "nuevos desde la última visita"
// sin depender de una política RLS en minorista_pedidos.
export async function GET() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ pedidos: [] })
  const db = createServerClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!CENTRAL_ROLES.includes(S(profile?.role))) return NextResponse.json({ pedidos: [] })

  const { data } = await db.from('minorista_pedidos')
    .select('id, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  return NextResponse.json({ pedidos: data || [] })
}
