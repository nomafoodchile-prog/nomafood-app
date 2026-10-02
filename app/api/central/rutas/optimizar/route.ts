import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCentralUser } from '@/lib/central/guard'
import { optimizeRoute } from '@/lib/routing'
import { geocodeDireccion } from '@/lib/geo/nominatim'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/central/rutas/optimizar  { ids: string[] (minorista), mayorista_ids?: string[] }
// Devuelve (SIN crear la ruta) el orden óptimo por calles + matriz de tiempos/
// distancias + config (origen, min por parada, hora de salida). Geocodifica las
// paradas que no tengan coordenadas (minorista y mayorista).
export async function POST(req: NextRequest) {
  const { isAdmin } = await getCentralUser()
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: { ids?: string[]; mayorista_ids?: string[] } = {}
  try { body = await req.json() } catch { /* vacío */ }
  const minIds = Array.isArray(body.ids) ? body.ids.filter(Boolean) : []
  const mayIds = Array.isArray(body.mayorista_ids) ? body.mayorista_ids.filter(Boolean) : []
  if (minIds.length === 0 && mayIds.length === 0) return NextResponse.json({ error: 'Sin pedidos' }, { status: 400 })

  const db = createServerClient()

  // Config
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

  type Parada = { tipo: 'minorista' | 'mayorista'; id: string; cliente: string | null; telefono: string | null; direccion: string | null; comuna: string | null; lat: number | null; lng: number | null }
  const paradas: Parada[] = []

  // Minorista
  if (minIds.length) {
    const { data } = await db.from('minorista_pedidos')
      .select('id, cliente_nombre, cliente_telefono, despacho_direccion, despacho_comuna, despacho_region, lat, lng').in('id', minIds)
    for (const p of data || []) {
      paradas.push({ tipo: 'minorista', id: p.id, cliente: p.cliente_nombre, telefono: p.cliente_telefono, direccion: p.despacho_direccion, comuna: p.despacho_comuna, lat: p.lat, lng: p.lng })
    }
  }
  // Mayorista
  if (mayIds.length) {
    const { data } = await db.from('mayorista_pedidos')
      .select('id, direccion_entrega, telefono_entrega, lat, lng, mayorista_id').in('id', mayIds)
    const ids = Array.from(new Set((data || []).map((p: any) => p.mayorista_id).filter(Boolean)))
    const { data: mays } = ids.length ? await db.from('mayoristas').select('id, nombre, empresa').in('id', ids) : { data: [] as any[] }
    const nom = new Map((mays || []).map((m: any) => [m.id, m.empresa || m.nombre || 'Mayorista']))
    for (const p of data || []) {
      paradas.push({ tipo: 'mayorista', id: p.id, cliente: nom.get(p.mayorista_id) || 'Mayorista', telefono: p.telefono_entrega, direccion: p.direccion_entrega, comuna: null, lat: p.lat, lng: p.lng })
    }
  }

  // Geocodificar las que no tengan coordenadas (persistiendo en su tabla)
  for (const p of paradas) {
    if (p.lat != null && p.lng != null) continue
    const q = [p.direccion, p.comuna].filter(Boolean).join(', ')
    const hit = q ? await geocodeDireccion(q) : null
    if (hit) {
      p.lat = hit.lat; p.lng = hit.lng
      if (p.tipo === 'minorista') {
        await db.from('minorista_pedidos').update({ lat: hit.lat, lng: hit.lng, geo_status: hit.precision === 'sector' ? 'revisar' : 'ok', dir_normalizada: hit.display }).eq('id', p.id)
      } else {
        await db.from('mayorista_pedidos').update({ lat: hit.lat, lng: hit.lng }).eq('id', p.id)
      }
    }
  }

  const conCoords = paradas.filter(p => p.lat != null && p.lng != null)
  const faltan = paradas.filter(p => p.lat == null || p.lng == null)
    .map(p => ({ id: p.id, tipo: p.tipo, cliente: p.cliente, direccion: p.direccion, comuna: p.comuna }))

  if (conCoords.length === 0) {
    return NextResponse.json({ ok: true, faltan, points: [], order: [], origen, serviceMin, horaSalida, provider: 'none' })
  }

  const stops = conCoords.map(p => ({ lat: Number(p.lat), lng: Number(p.lng) }))
  const result = await optimizeRoute({ lat: origen.lat, lng: origen.lng }, stops)

  const points = [
    { origin: true, nombre: origen.nombre, lat: origen.lat, lng: origen.lng },
    ...conCoords.map(p => ({ origin: false, tipo: p.tipo, id: p.id, cliente: p.cliente, telefono: p.telefono, direccion: p.direccion, comuna: p.comuna, lat: Number(p.lat), lng: Number(p.lng) })),
  ]

  return NextResponse.json({ ok: true, provider: result.provider, order: result.order, matrix: result.matrix, points, origen, serviceMin, horaSalida, faltan })
}
