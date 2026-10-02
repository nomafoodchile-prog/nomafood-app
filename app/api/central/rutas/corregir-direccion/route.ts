import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCentralUser } from '@/lib/central/guard'
import { geocodeDireccion } from '@/lib/geo/nominatim'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// POST /api/central/rutas/corregir-direccion  { id, direccion, comuna? }
// Corrige la dirección de despacho SOLO para efectos de ruteo, sin pisar la
// dirección original del cliente. Guarda trazabilidad: dir_normalizada, quién
// y cuándo (geo_corregido_por / geo_corregido_at), geo_status='corregida'.
export async function POST(req: NextRequest) {
  const { isAdmin, userId } = await getCentralUser()
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: { id?: string; direccion?: string; comuna?: string; tipo?: string } = {}
  try { body = await req.json() } catch { /* vacío */ }
  const id = body.id
  const direccion = (body.direccion || '').trim()
  if (!id || !direccion) return NextResponse.json({ error: 'Falta id o dirección' }, { status: 400 })

  const consulta = [direccion, body.comuna].filter(Boolean).join(', ')
  const hit = await geocodeDireccion(consulta)
  if (!hit) {
    return NextResponse.json({ ok: false, error: 'No se pudo ubicar esa dirección. Revisa calle, número y comuna.' }, { status: 200 })
  }

  const db = createServerClient()
  let error
  if (body.tipo === 'mayorista') {
    ({ error } = await db.from('mayorista_pedidos').update({ lat: hit.lat, lng: hit.lng }).eq('id', id))
  } else {
    ({ error } = await db.from('minorista_pedidos').update({
      lat: hit.lat, lng: hit.lng,
      geo_status: 'corregida',
      dir_normalizada: direccion + (body.comuna ? ', ' + body.comuna : ''),
      geo_corregido_por: userId,
      geo_corregido_at: new Date().toISOString(),
    }).eq('id', id))
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, lat: hit.lat, lng: hit.lng, precision: hit.precision })
}
