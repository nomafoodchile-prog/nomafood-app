import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCentralUser } from '@/lib/central/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CLAVE = 'proyeccion_ventas'
const ROLES_FIN = ['SuperAdmin', 'Administracion', 'Gerencia']

// GET → trae los números guardados de la proyección
export async function GET() {
  const u = await getCentralUser()
  if (!u.userId || !ROLES_FIN.includes(u.role || '')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const { data } = await db.from('app_config').select('valor').eq('clave', CLAVE).maybeSingle()
  let datos: Record<string, unknown> = {}
  try {
    const v = (data as { valor: unknown } | null)?.valor
    if (v) datos = (typeof v === 'string' ? JSON.parse(v) : v) as Record<string, unknown>
  } catch { /* vacío */ }
  return NextResponse.json({ datos })
}

// POST { datos } → guarda los números de la proyección
export async function POST(req: NextRequest) {
  const u = await getCentralUser()
  if (!u.userId || !ROLES_FIN.includes(u.role || '')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  let body: Record<string, unknown> = {}
  try { body = await req.json() as Record<string, unknown> } catch { /* sin body */ }
  const valor = JSON.stringify(body.datos ?? {})
  const db = createServerClient()
  const { data, error: eUpd } = await db.from('app_config').update({ valor }).eq('clave', CLAVE).select('clave')
  if (eUpd) return NextResponse.json({ error: 'No se pudo guardar (revisa app_config). ' + eUpd.message }, { status: 500 })
  if (!data || data.length === 0) {
    const { error: eIns } = await db.from('app_config').insert({ clave: CLAVE, valor })
    if (eIns) return NextResponse.json({ error: 'No se pudo guardar (revisa app_config). ' + eIns.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
