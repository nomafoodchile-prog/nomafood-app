import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCentralUser } from '@/lib/central/guard'
import { optimizeRoute } from '@/lib/routing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const clock = (x: number) => { const v = ((Math.round(x) % 1440) + 1440) % 1440; return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}` }

// GET /api/central/rutas/[id] → detalle de una ruta: cabecera + chofer + paradas
// ordenadas (para volver a ver la ruta y su mapa cuando se quiera).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { isAdmin } = await getCentralUser()
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const { data: ruta, error } = await db
    .from('delivery_routes')
    .select('*, chofer:drivers(nombre, telefono), stops:delivery_route_stops(*)')
    .eq('id', params.id)
    .single()
  if (error || !ruta) return NextResponse.json({ error: 'Ruta no encontrada' }, { status: 404 })
  const stops = ((ruta as any).stops || []).slice().sort((a: any, b: any) => a.orden - b.orden)
  return NextResponse.json({ ok: true, ruta: { ...ruta, stops } })
}

// PATCH /api/central/rutas/[id] → editar una ruta ya creada:
//   { remove?: string[] (ids de pedidos a sacar), chofer_id?, hora_salida? }
// Saca las paradas indicadas (libera esos pedidos), reasigna chofer y/o cambia
// la hora de salida, y RE-OPTIMIZA las paradas restantes (orden + ETA).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { isAdmin } = await getCentralUser()
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()

  let body: { remove?: string[]; chofer_id?: string | null; hora_salida?: string } = {}
  try { body = await req.json() } catch { /* vacío */ }
  const removeSet = new Set((body.remove || []).filter(Boolean))

  const { data: ruta } = await db.from('delivery_routes')
    .select('id, origen_lat, origen_lng, service_min_parada, hora_salida_plan, chofer_id, estado').eq('id', params.id).maybeSingle()
  if (!ruta) return NextResponse.json({ error: 'Ruta no encontrada' }, { status: 404 })

  const { data: stopsRaw } = await db.from('delivery_route_stops')
    .select('id, orden, minorista_pedido_id, mayorista_pedido_id, lat, lng').eq('route_id', params.id)
  const stops = stopsRaw || []

  const esQuitado = (s: any) => (s.minorista_pedido_id && removeSet.has(s.minorista_pedido_id)) || (s.mayorista_pedido_id && removeSet.has(s.mayorista_pedido_id))
  const quitados = stops.filter(esQuitado)
  const quedan = stops.filter((s: any) => !esQuitado(s))

  // Liberar pedidos quitados
  const qMin = quitados.filter((s: any) => s.minorista_pedido_id).map((s: any) => s.minorista_pedido_id)
  const qMay = quitados.filter((s: any) => s.mayorista_pedido_id).map((s: any) => s.mayorista_pedido_id)
  if (qMin.length) await db.from('minorista_pedidos').update({ route_id: null, chofer_id: null, estado_entrega: 'pendiente' }).in('id', qMin)
  if (qMay.length) await db.from('mayorista_pedidos').update({ estado_entrega: 'pendiente' }).in('id', qMay)
  if (quitados.length) await db.from('delivery_route_stops').delete().in('id', quitados.map((s: any) => s.id))

  if (quedan.length === 0) {
    // Si no queda nada, elimina la ruta
    await db.from('delivery_routes').delete().eq('id', params.id)
    return NextResponse.json({ ok: true, vacia: true })
  }

  // Hora de salida (string HH:MM): del body, o de la ruta (hora Chile), o 10:00
  let hora = body.hora_salida
  if (!hora) {
    try { hora = ruta.hora_salida_plan ? new Date(ruta.hora_salida_plan).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Santiago' }) : '10:00' }
    catch { hora = '10:00' }
  }
  hora = String(hora).slice(0, 5)
  const serviceMin = Number(ruta.service_min_parada || 8)

  // Re-optimizar las que tienen coordenadas
  const conCoords = quedan.filter((s: any) => s.lat != null && s.lng != null)
  const sinCoords = quedan.filter((s: any) => s.lat == null || s.lng == null)
  const origin = { lat: Number(ruta.origen_lat ?? -33.4015), lng: Number(ruta.origen_lng ?? -70.7260) }
  const result = await optimizeRoute(origin, conCoords.map((s: any) => ({ lat: Number(s.lat), lng: Number(s.lng) })))

  const [hh, mm] = hora.split(':').map(Number)
  let t = (hh || 0) * 60 + (mm || 0), km = 0, prev = 0
  const hoy = new Date().toISOString().slice(0, 10)
  const ordenVisita = (result.order || []).filter(i => i !== 0)
  let n = 0
  for (const pi of ordenVisita) {
    const s = conCoords[pi - 1]
    const legS = result.matrix.duration_s?.[prev]?.[pi] ?? 0
    const legM = result.matrix.distance_m?.[prev]?.[pi] ?? 0
    t += legS / 60; km += legM / 1000
    n += 1
    await db.from('delivery_route_stops').update({ orden: n, eta: `${hoy}T${clock(t)}:00-03:00` }).eq('id', s.id)
    t += serviceMin; prev = pi
  }
  // Paradas sin coords al final (sin ETA)
  for (const s of sinCoords) { n += 1; await db.from('delivery_route_stops').update({ orden: n, eta: null }).eq('id', s.id) }

  const totalMin = Math.round(t - ((hh || 0) * 60 + (mm || 0)))
  const patch: Record<string, any> = {
    km_estimados: Math.round(km * 10) / 10,
    duracion_min_estimada: totalMin,
    hora_salida_plan: `${hoy}T${hora}:00-03:00`,
    updated_at: new Date().toISOString(),
  }
  if ('chofer_id' in body) { patch.chofer_id = body.chofer_id || null; patch.estado = body.chofer_id ? 'asignada' : 'planificada' }
  await db.from('delivery_routes').update(patch).eq('id', params.id)

  if ('chofer_id' in body) {
    const keepMin = quedan.filter((s: any) => s.minorista_pedido_id).map((s: any) => s.minorista_pedido_id)
    if (keepMin.length) await db.from('minorista_pedidos').update({ chofer_id: body.chofer_id || null }).in('id', keepMin)
  }

  return NextResponse.json({ ok: true, km: patch.km_estimados, duracion_min: totalMin, paradas: n })
}

// DELETE /api/central/rutas/[id] → deshace una ruta: libera sus pedidos
// (vuelven a "sin ruta" y seleccionables) y elimina la ruta y sus paradas.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { isAdmin } = await getCentralUser()
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()

  // Pedidos mayoristas que estaban en la ruta → volver a pendiente
  const { data: stops } = await db.from('delivery_route_stops')
    .select('mayorista_pedido_id').eq('route_id', params.id).not('mayorista_pedido_id', 'is', null)
  const mayIds = (stops || []).map((s: any) => s.mayorista_pedido_id).filter(Boolean)
  if (mayIds.length) await db.from('mayorista_pedidos').update({ estado_entrega: 'pendiente' }).in('id', mayIds)

  // Pedidos minoristas de la ruta → liberar (sin ruta, sin chofer, pendiente)
  await db.from('minorista_pedidos')
    .update({ route_id: null, chofer_id: null, estado_entrega: 'pendiente' })
    .eq('route_id', params.id)

  // Borrar paradas y la ruta
  await db.from('delivery_route_stops').delete().eq('route_id', params.id)
  const { error } = await db.from('delivery_routes').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
