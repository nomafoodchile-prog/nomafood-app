import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']

async function esAdmin(): Promise<boolean> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return false
  const { data: p } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  return CENTRAL_ROLES.includes(String(p?.role || ''))
}

// GET /api/central/aldea/solicitudes → todas las solicitudes de las sucursales Aldea
export async function GET() {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()

  const { data: sols } = await db.from('aldea_solicitudes')
    .select('id, folio, mayorista_id, estado, prioridad, fecha_requerida, observaciones, chofer_nombre, chofer_telefono, hora_estimada, created_at')
    .order('created_at', { ascending: false }).limit(200)

  const solIds = (sols || []).map(s => s.id)
  const sucIds = [...new Set((sols || []).map(s => s.mayorista_id))]

  const sucMap = new Map<string, string>()
  if (sucIds.length) {
    const { data: sucs } = await db.from('mayoristas').select('id, nombre').in('id', sucIds)
    for (const s of sucs || []) sucMap.set(s.id, s.nombre)
  }

  const itemsBySol = new Map<string, any[]>()
  if (solIds.length) {
    const { data: items } = await db.from('aldea_solicitud_items')
      .select('id, solicitud_id, producto_nombre, unidad, cantidad_solicitada, cantidad_aprobada, cantidad_preparada, cantidad_despachada, cantidad_recibida')
      .in('solicitud_id', solIds)
    for (const it of items || []) { const a = itemsBySol.get(it.solicitud_id) || []; a.push(it); itemsBySol.set(it.solicitud_id, a) }
  }

  const solicitudes = (sols || []).map(s => ({
    ...s,
    sucursal: sucMap.get(s.mayorista_id) || 'Sucursal',
    items: itemsBySol.get(s.id) || [],
  }))

  const porEstado: Record<string, number> = {}
  for (const s of solicitudes) porEstado[s.estado] = (porEstado[s.estado] || 0) + 1

  return NextResponse.json({ solicitudes, resumen: { total: solicitudes.length, porEstado } })
}
