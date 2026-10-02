import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCentralUser } from '@/lib/central/guard'
import { optimizeRoute } from '@/lib/routing'
import { geocodeDireccion } from '@/lib/geo/nominatim'

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
//   { remove?, add_minorista?, add_mayorista?, chofer_id?, hora_salida? }
// Saca y/o AGREGA pedidos (geocodificando los nuevos por su dirección),
// reasigna chofer y cambia la hora; reconstruye y RE-OPTIMIZA todo (orden+ETA).
// Devuelve `faltan` = pedidos sin dirección ubicable (para corregir).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { isAdmin } = await getCentralUser()
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()

  let body: { remove?: string[]; add_minorista?: string[]; add_mayorista?: string[]; chofer_id?: string | null; hora_salida?: string } = {}
  try { body = await req.json() } catch { /* vacío */ }
  const removeSet = new Set((body.remove || []).filter(Boolean))
  const addMin = (body.add_minorista || []).filter(Boolean)
  const addMay = (body.add_mayorista || []).filter(Boolean)

  const { data: ruta } = await db.from('delivery_routes')
    .select('id, origen_lat, origen_lng, origen_nombre, service_min_parada, hora_salida_plan, chofer_id, estado').eq('id', params.id).maybeSingle()
  if (!ruta) return NextResponse.json({ error: 'Ruta no encontrada' }, { status: 404 })

  const { data: stopsRaw } = await db.from('delivery_route_stops')
    .select('minorista_pedido_id, mayorista_pedido_id').eq('route_id', params.id)
  const stops = stopsRaw || []
  const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean)))
  const curMin = uniq(stops.map((s: any) => s.minorista_pedido_id))
  const curMay = uniq(stops.map((s: any) => s.mayorista_pedido_id))

  const finalMin = uniq([...curMin.filter(id => !removeSet.has(id)), ...addMin])
  const finalMay = uniq([...curMay.filter(id => !removeSet.has(id)), ...addMay])

  // Liberar pedidos quitados
  const remMin = curMin.filter(id => removeSet.has(id))
  const remMay = curMay.filter(id => removeSet.has(id))
  if (remMin.length) await db.from('minorista_pedidos').update({ route_id: null, chofer_id: null, estado_entrega: 'pendiente' }).in('id', remMin)
  if (remMay.length) await db.from('mayorista_pedidos').update({ estado_entrega: 'pendiente' }).in('id', remMay)

  if (finalMin.length === 0 && finalMay.length === 0) {
    await db.from('delivery_route_stops').delete().eq('route_id', params.id)
    await db.from('delivery_routes').delete().eq('id', params.id)
    return NextResponse.json({ ok: true, vacia: true })
  }

  // Snapshots de todas las paradas finales
  type Parada = { tipo: 'minorista' | 'mayorista'; id: string; cliente: string | null; telefono: string | null; direccion: string | null; comuna: string | null; lat: number | null; lng: number | null }
  const paradas: Parada[] = []
  if (finalMin.length) {
    const { data } = await db.from('minorista_pedidos')
      .select('id, cliente_nombre, cliente_telefono, despacho_direccion, despacho_comuna, despacho_region, lat, lng').in('id', finalMin)
    for (const p of data || []) paradas.push({ tipo: 'minorista', id: p.id, cliente: p.cliente_nombre, telefono: p.cliente_telefono, direccion: p.despacho_direccion, comuna: p.despacho_comuna || p.despacho_region, lat: p.lat, lng: p.lng })
  }
  if (finalMay.length) {
    const { data } = await db.from('mayorista_pedidos').select('id, direccion_entrega, telefono_entrega, lat, lng, mayorista_id').in('id', finalMay)
    const ids = uniq((data || []).map((p: any) => p.mayorista_id))
    const { data: mays } = ids.length ? await db.from('mayoristas').select('id, nombre, empresa').in('id', ids) : { data: [] as any[] }
    const nom = new Map((mays || []).map((m: any) => [m.id, m.empresa || m.nombre || 'Mayorista']))
    for (const p of data || []) paradas.push({ tipo: 'mayorista', id: p.id, cliente: nom.get(p.mayorista_id) || 'Mayorista', telefono: p.telefono_entrega, direccion: p.direccion_entrega, comuna: null, lat: p.lat, lng: p.lng })
  }

  // Geocodificar las que no tengan coordenadas
  for (const p of paradas) {
    if (p.lat != null && p.lng != null) continue
    const q = [p.direccion, p.comuna].filter(Boolean).join(', ')
    const hit = q ? await geocodeDireccion(q) : null
    if (hit && hit.precision !== 'sector') {
      p.lat = hit.lat; p.lng = hit.lng
      if (p.tipo === 'minorista') await db.from('minorista_pedidos').update({ lat: hit.lat, lng: hit.lng, geo_status: 'ok', dir_normalizada: hit.display }).eq('id', p.id)
      else await db.from('mayorista_pedidos').update({ lat: hit.lat, lng: hit.lng }).eq('id', p.id)
    } else if (hit) {
      p.lat = hit.lat; p.lng = hit.lng
      if (p.tipo === 'minorista') await db.from('minorista_pedidos').update({ lat: hit.lat, lng: hit.lng, geo_status: 'revisar', dir_normalizada: hit.display }).eq('id', p.id)
      else await db.from('mayorista_pedidos').update({ lat: hit.lat, lng: hit.lng }).eq('id', p.id)
    }
  }

  const conCoords = paradas.filter(p => p.lat != null && p.lng != null)
  const sinCoords = paradas.filter(p => p.lat == null || p.lng == null)
  const faltan = sinCoords.map(p => ({ id: p.id, tipo: p.tipo, cliente: p.cliente, direccion: p.direccion, comuna: p.comuna }))

  // Hora de salida + origen + servicio
  let hora = body.hora_salida
  if (!hora) {
    try { hora = ruta.hora_salida_plan ? new Date(ruta.hora_salida_plan).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Santiago' }) : '10:00' } catch { hora = '10:00' }
  }
  hora = String(hora).slice(0, 5)
  const serviceMin = Number(ruta.service_min_parada || 8)
  const origin = { lat: Number(ruta.origen_lat ?? -33.4015), lng: Number(ruta.origen_lng ?? -70.7260) }
  const result = await optimizeRoute(origin, conCoords.map(p => ({ lat: Number(p.lat), lng: Number(p.lng) })))

  const [hh, mm] = hora.split(':').map(Number)
  let t = (hh || 0) * 60 + (mm || 0), km = 0, prev = 0
  const hoy = new Date().toISOString().slice(0, 10)
  const choferFinal = ('chofer_id' in body) ? (body.chofer_id || null) : (ruta.chofer_id || null)

  const rows: any[] = []
  let n = 0
  for (const pi of (result.order || []).filter(i => i !== 0)) {
    const p = conCoords[pi - 1]
    const legS = result.matrix.duration_s?.[prev]?.[pi] ?? 0
    const legM = result.matrix.distance_m?.[prev]?.[pi] ?? 0
    t += legS / 60; km += legM / 1000; n += 1
    rows.push({ route_id: params.id, orden: n, order_tipo: p.tipo, minorista_pedido_id: p.tipo === 'minorista' ? p.id : null, mayorista_pedido_id: p.tipo === 'mayorista' ? p.id : null, cliente_nombre: p.cliente, telefono: p.telefono, direccion: p.direccion, comuna: p.comuna, lat: p.lat, lng: p.lng, eta: `${hoy}T${clock(t)}:00-03:00`, estado_entrega: 'pendiente' })
    t += serviceMin; prev = pi
  }
  for (const p of sinCoords) { n += 1; rows.push({ route_id: params.id, orden: n, order_tipo: p.tipo, minorista_pedido_id: p.tipo === 'minorista' ? p.id : null, mayorista_pedido_id: p.tipo === 'mayorista' ? p.id : null, cliente_nombre: p.cliente, telefono: p.telefono, direccion: p.direccion, comuna: p.comuna, lat: null, lng: null, eta: null, estado_entrega: 'pendiente' }) }

  // Reconstruir paradas
  await db.from('delivery_route_stops').delete().eq('route_id', params.id)
  if (rows.length) await db.from('delivery_route_stops').insert(rows)

  // Vincular pedidos
  if (finalMin.length) await db.from('minorista_pedidos').update({ route_id: params.id, chofer_id: choferFinal, estado_entrega: 'pendiente' }).in('id', finalMin)
  if (finalMay.length) await db.from('mayorista_pedidos').update({ estado_entrega: 'pendiente' }).in('id', finalMay)

  const totalMin = Math.round(t - ((hh || 0) * 60 + (mm || 0)))
  await db.from('delivery_routes').update({
    km_estimados: Math.round(km * 10) / 10, duracion_min_estimada: totalMin,
    hora_salida_plan: `${hoy}T${hora}:00-03:00`, chofer_id: choferFinal,
    estado: choferFinal ? 'asignada' : 'planificada', updated_at: new Date().toISOString(),
  }).eq('id', params.id)

  return NextResponse.json({ ok: true, km: Math.round(km * 10) / 10, duracion_min: totalMin, paradas: n, faltan })
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
