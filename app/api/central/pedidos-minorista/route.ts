import { NextResponse } from 'next/server'
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

// GET /api/central/pedidos-minorista → pedidos minorista (retail) desde la Central.
// Se lee por el servidor (service-role) para no exponer datos de clientes vía RLS
// a cualquier usuario autenticado (p.ej. clientes del portal mayorista).
export async function GET() {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const { data } = await db
    .from('minorista_pedidos')
    .select('*, items:minorista_pedido_items(*)')
    .order('created_at', { ascending: false })
    .limit(200)
  return NextResponse.json({ pedidos: data || [] })
}
