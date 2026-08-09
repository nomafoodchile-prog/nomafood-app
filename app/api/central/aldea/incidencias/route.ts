import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']
const ESTADOS = ['nueva', 'en_revision', 'en_solucion', 'resuelta', 'cerrada']

async function esAdmin(): Promise<boolean> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return false
  const { data: p } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  return CENTRAL_ROLES.includes(String(p?.role || ''))
}

// GET → todas las incidencias/consultas de Aldea (con sucursal + folio)
export async function GET() {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()

  const { data: incs } = await db.from('aldea_incidencias')
    .select('id, mayorista_id, solicitud_id, tipo, descripcion, estado, respuesta_central, created_at')
    .order('created_at', { ascending: false }).limit(200)

  const sucIds = [...new Set((incs || []).map(i => i.mayorista_id).filter(Boolean))] as string[]
  const solIds = [...new Set((incs || []).map(i => i.solicitud_id).filter(Boolean))] as string[]
  const sucMap = new Map<string, string>(); const solMap = new Map<string, string>()
  if (sucIds.length) { const { data } = await db.from('mayoristas').select('id, nombre').in('id', sucIds); for (const s of data || []) sucMap.set(s.id, s.nombre) }
  if (solIds.length) { const { data } = await db.from('aldea_solicitudes').select('id, folio').in('id', solIds); for (const s of data || []) solMap.set(s.id, s.folio) }

  const incidencias = (incs || []).map(i => ({ ...i, sucursal: i.mayorista_id ? (sucMap.get(i.mayorista_id) || 'Sucursal') : '—', folio: i.solicitud_id ? (solMap.get(i.solicitud_id) || null) : null }))
  const abiertas = incidencias.filter(i => !['resuelta', 'cerrada'].includes(i.estado)).length
  return NextResponse.json({ incidencias, abiertas })
}

// PATCH → responder / cambiar estado
export async function PATCH(req: NextRequest) {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'Falta la incidencia' }, { status: 400 })

  const upd: Record<string, any> = { updated_at: new Date().toISOString() }
  if (typeof body.respuesta_central === 'string') upd.respuesta_central = body.respuesta_central.trim() || null
  if (body.estado && ESTADOS.includes(String(body.estado))) upd.estado = body.estado

  const { error } = await db.from('aldea_incidencias').update(upd).eq('id', body.id)
  if (error) return NextResponse.json({ error: 'No se pudo guardar.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
