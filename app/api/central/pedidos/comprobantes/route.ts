import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CLAVE = 'comprobantes_pedidos'
const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']

// GET → mapa { [pedido_id]: { url, at, numero } } de comprobantes subidos por clientes
export async function GET() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!CENTRAL_ROLES.includes(String(profile?.role || ''))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data } = await db.from('app_config').select('valor').eq('clave', CLAVE).maybeSingle()
  let comprobantes: Record<string, { url?: string; at?: string; numero?: string }> = {}
  try {
    const v = (data as { valor: unknown } | null)?.valor
    comprobantes = v ? (typeof v === 'string' ? JSON.parse(v) : v) as typeof comprobantes : {}
  } catch { comprobantes = {} }
  return NextResponse.json({ comprobantes })
}
