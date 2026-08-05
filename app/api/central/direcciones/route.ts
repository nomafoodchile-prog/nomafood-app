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

// GET → direcciones de despacho propuestas por los clientes (para revisar/aprobar)
export async function GET() {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()

  const { data: dirs } = await db.from('mayorista_direcciones')
    .select('id, mayorista_id, alias, direccion, comuna, contacto, telefono, estado, created_at')
    .order('created_at', { ascending: false })

  const lista = dirs || []
  const ids = [...new Set(lista.map(d => d.mayorista_id))]
  const nombreMap = new Map<string, string>()
  if (ids.length) {
    const { data: mays } = await db.from('mayoristas').select('id, empresa, nombre').in('id', ids)
    for (const m of mays || []) nombreMap.set(m.id, m.empresa || m.nombre || 'Cliente')
  }

  const direcciones = lista.map(d => ({ ...d, cliente: nombreMap.get(d.mayorista_id) || 'Cliente' }))
  return NextResponse.json({ direcciones })
}

// POST → aprobar / rechazar una dirección
export async function POST(req: NextRequest) {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const body = await req.json()

  if (!body.id || !['aprobada', 'rechazada', 'pendiente'].includes(String(body.estado))) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  const { error } = await db.from('mayorista_direcciones').update({ estado: body.estado }).eq('id', body.id)
  if (error) return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
