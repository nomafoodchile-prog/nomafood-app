import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCentralUser } from '@/lib/central/guard'
import { optimizeRoute } from '@/lib/routing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// POST /api/central/rutas/optimizar  { ids: string[] }
// Devuelve (SIN escribir en la BD) el orden óptimo de paradas por red vial +
// la matriz de tiempos/distancias para recalcular al reordenar a mano, + la
// configuración (origen, min por parada, hora de salida). Los pedidos sin
// coordenadas se devuelven en `faltan` para geocodificar o corregir primero.
export async function POST(req: NextRequest) {
  const { isAdmin } = await getCentralUser()
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: { ids?: string[] } = {}
  try { body = await req.json() } catch { /* vacío */ }
  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : []
  if (ids.length === 0) return NextResponse.json({ error: 'Sin pedidos' }, { status: 400 })

  const db = createServerClient()

  // Config desde app_config (con valores por defecto si no existe la clave)
  const { data: cfgRows } = await db.from('app_config').select('clave, valor')
    .in('clave', ['despacho_service_min', 'despacho_hora_salida', 'despacho_origen_nombre', 'despacho_origen_lat', 'despacho_origen_lng'])
  const cfg = Object.fromEntries((cfgRows || []).map(r => [r.clave, r.valor]))
  const origen = {
    nombre: cfg['despacho_origen_nombre'] || 'Centro de despacho',
    lat: Number(cfg['despacho_origen_lat'] ?? -33.4015),
    lng: Number(cfg['despacho_origen_lng'] ?? -70.7260),
  }
  const serviceMin = Number(cfg['despacho_service_min'] ?? 8)
  const horaSalida = cfg['despacho_hora_salida'] || '10:00'

  const { data: pedidos, error } = await db
    .from('minorista_pedidos')
    .select('id, cliente_nombre, cliente_telefono, despacho_direccion, despacho_comuna, lat, lng, geo_status')
    .in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const conCoords = (pedidos || []).filter(p => p.lat != null && p.lng != null)
  const faltan = (pedidos || []).filter(p => p.lat == null || p.lng == null)
    .map(p => ({ id: p.id, cliente: p.cliente_nombre, direccion: p.despacho_direccion, comuna: p.despacho_comuna }))

  if (conCoords.length === 0) {
    return NextResponse.json({ ok: true, faltan, points: [], order: [], origen, serviceMin, horaSalida, provider: 'none' })
  }

  const stops = conCoords.map(p => ({ lat: Number(p.lat), lng: Number(p.lng) }))
  const result = await optimizeRoute({ lat: origen.lat, lng: origen.lng }, stops)

  // points: índice 0 = origen; 1..n = paradas en el MISMO orden que se mandó a optimizar
  const points = [
    { origin: true, nombre: origen.nombre, lat: origen.lat, lng: origen.lng },
    ...conCoords.map(p => ({
      origin: false, id: p.id, cliente: p.cliente_nombre, telefono: p.cliente_telefono,
      direccion: p.despacho_direccion, comuna: p.despacho_comuna,
      lat: Number(p.lat), lng: Number(p.lng), geo_status: p.geo_status,
    })),
  ]

  return NextResponse.json({
    ok: true, provider: result.provider, order: result.order, matrix: result.matrix,
    points, origen, serviceMin, horaSalida, faltan,
  })
}
