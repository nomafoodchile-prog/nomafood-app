import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCentralUser } from '@/lib/central/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/central/rutas → lista de rutas de despacho (panel Operaciones › Rutas)
export async function GET() {
  const { isAdmin } = await getCentralUser()
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const { data, error } = await db
    .from('delivery_routes')
    .select('id, codigo, fecha, estado, marca, km_estimados, duracion_min_estimada, hora_salida_plan, created_at, chofer:drivers(nombre), stops:delivery_route_stops(id)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rutas = (data || []).map((r: any) => ({
    id: r.id, codigo: r.codigo, fecha: r.fecha, estado: r.estado, marca: r.marca,
    km: r.km_estimados, duracion_min: r.duracion_min_estimada, hora_salida: r.hora_salida_plan,
    chofer: r.chofer?.nombre || null, paradas: (r.stops || []).length, created_at: r.created_at,
  }))
  return NextResponse.json({ ok: true, rutas })
}

// POST /api/central/rutas → crea (confirma) una ruta con sus paradas ordenadas.
// body: { stops:[{pedido_id, eta}], chofer_id?, service_min, hora_salida,
//         km_estimados, duracion_min, origen:{nombre,lat,lng}, warehouse_id?, marca? }
export async function POST(req: NextRequest) {
  const { isAdmin, userId } = await getCentralUser()
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: any = {}
  try { body = await req.json() } catch { /* vacío */ }
  const stops: { pedido_id: string; eta?: string; tipo?: string }[] = Array.isArray(body.stops) ? body.stops.filter((s: any) => s?.pedido_id) : []
  if (stops.length === 0) return NextResponse.json({ error: 'La ruta no tiene paradas' }, { status: 400 })
  const esMayorista = (s: { tipo?: string }) => s.tipo === 'mayorista'

  const db = createServerClient()

  // Código correlativo del día: R-YYYY-MM-DD-NN
  const hoy = new Date().toISOString().slice(0, 10)
  const { count } = await db.from('delivery_routes').select('id', { count: 'exact', head: true }).eq('fecha', hoy)
  const nn = String((count || 0) + 1).padStart(2, '0')
  const codigo = `R-${hoy}-${nn}`

  // Hora de salida planificada (hora local de Chile, aproximada)
  const hora = String(body.hora_salida || '10:00')
  const horaSalidaPlan = `${hoy}T${hora.length === 5 ? hora : '10:00'}:00-03:00`

  const choferId = body.chofer_id || null
  const origen = body.origen || {}

  const { data: ruta, error: rErr } = await db.from('delivery_routes').insert({
    codigo, fecha: hoy, marca: body.marca || null,
    warehouse_id: body.warehouse_id || null,
    origen_nombre: origen.nombre || null, origen_lat: origen.lat ?? null, origen_lng: origen.lng ?? null,
    chofer_id: choferId, vehiculo: body.vehiculo || null,
    hora_salida_plan: horaSalidaPlan,
    km_estimados: body.km_estimados ?? null,
    duracion_min_estimada: body.duracion_min ?? null,
    service_min_parada: body.service_min ?? 8,
    estado: choferId ? 'asignada' : 'planificada',
    provider: body.provider || 'osrm',
    creado_por: userId,
  }).select('id, codigo, estado').single()
  if (rErr || !ruta) return NextResponse.json({ error: rErr?.message || 'No se pudo crear la ruta' }, { status: 500 })

  // Snapshot de datos de cada parada, según su tipo
  const minIds = stops.filter(s => !esMayorista(s)).map(s => s.pedido_id)
  const mayIds = stops.filter(esMayorista).map(s => s.pedido_id)

  const { data: minPeds } = minIds.length ? await db.from('minorista_pedidos')
    .select('id, cliente_nombre, cliente_telefono, despacho_direccion, despacho_comuna, lat, lng').in('id', minIds) : { data: [] as any[] }
  const minMap = new Map((minPeds || []).map((p: any) => [p.id, p]))

  const { data: mayPeds } = mayIds.length ? await db.from('mayorista_pedidos')
    .select('id, direccion_entrega, telefono_entrega, lat, lng, mayorista_id').in('id', mayIds) : { data: [] as any[] }
  const nomIds = Array.from(new Set((mayPeds || []).map((p: any) => p.mayorista_id).filter(Boolean)))
  const { data: mays } = nomIds.length ? await db.from('mayoristas').select('id, nombre, empresa').in('id', nomIds) : { data: [] as any[] }
  const nomMap = new Map((mays || []).map((m: any) => [m.id, m.empresa || m.nombre || 'Mayorista']))
  const mayMap = new Map((mayPeds || []).map((p: any) => [p.id, p]))

  const stopRows = stops.map((s, i) => {
    if (esMayorista(s)) {
      const p: any = mayMap.get(s.pedido_id) || {}
      return {
        route_id: ruta.id, orden: i + 1, order_tipo: 'mayorista', mayorista_pedido_id: s.pedido_id,
        cliente_nombre: nomMap.get(p.mayorista_id) || 'Mayorista', telefono: p.telefono_entrega || null,
        direccion: p.direccion_entrega || null, comuna: null,
        lat: p.lat ?? null, lng: p.lng ?? null, eta: s.eta || null, estado_entrega: 'pendiente',
      }
    }
    const p: any = minMap.get(s.pedido_id) || {}
    return {
      route_id: ruta.id, orden: i + 1, order_tipo: 'minorista', minorista_pedido_id: s.pedido_id,
      cliente_nombre: p.cliente_nombre || null, telefono: p.cliente_telefono || null,
      direccion: p.despacho_direccion || null, comuna: p.despacho_comuna || null,
      lat: p.lat ?? null, lng: p.lng ?? null, eta: s.eta || null, estado_entrega: 'pendiente',
    }
  })
  const { error: sErr } = await db.from('delivery_route_stops').insert(stopRows)
  if (sErr) {
    await db.from('delivery_routes').delete().eq('id', ruta.id)
    return NextResponse.json({ error: sErr.message }, { status: 500 })
  }

  // Vincula los pedidos minorista a la ruta y al chofer (estado de despacho)
  if (minIds.length) await db.from('minorista_pedidos').update({ route_id: ruta.id, chofer_id: choferId, estado_entrega: 'pendiente' }).in('id', minIds)
  // Para mayorista, marca la pista de entrega (sin tocar su route_id propio)
  if (mayIds.length) await db.from('mayorista_pedidos').update({ estado_entrega: 'pendiente' }).in('id', mayIds)

  return NextResponse.json({ ok: true, route: ruta })
}
