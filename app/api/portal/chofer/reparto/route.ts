import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Reparto minorista para la app del CHOFER.
// Lee/escribe con service-role pero validando SIEMPRE que la ruta/parada sea
// del chofer autenticado (drivers.profile_id = auth.uid()).

async function getDriver() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return { user: null, driver: null, db: createServerClient() }
  const db = createServerClient()
  const { data: driver } = await db.from('drivers').select('id, nombre').eq('profile_id', user.id).maybeSingle()
  return { user, driver, db }
}

const ACTIVOS = ['planificada', 'asignada', 'en_ruta']
const ESTADOS_OK = ['en_ruta', 'llego_cliente', 'entregado', 'no_entregado', 'incidencia', 'pendiente']

// GET → rutas minorista activas del chofer, con sus paradas ordenadas.
export async function GET() {
  const { user, driver, db } = await getDriver()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!driver) return NextResponse.json({ ok: true, rutas: [] })

  const { data, error } = await db
    .from('delivery_routes')
    .select('id, codigo, estado, fecha, origen_nombre, origen_lat, origen_lng, km_estimados, duracion_min_estimada, hora_salida_plan, stops:delivery_route_stops(*)')
    .eq('chofer_id', driver.id)
    .order('fecha', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rutas = (data || [])
    .filter((r: any) => ACTIVOS.includes(String(r.estado)))
    .map((r: any) => ({ ...r, stops: (r.stops || []).slice().sort((a: any, b: any) => a.orden - b.orden) }))
  return NextResponse.json({ ok: true, driver: { nombre: driver.nombre }, rutas })
}

// POST → el chofer actualiza el estado de una parada.
// body: { stop_id, estado, lat?, lng? }
export async function POST(req: NextRequest) {
  const { user, driver, db } = await getDriver()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!driver) return NextResponse.json({ error: 'Usuario sin chofer asociado' }, { status: 403 })

  let body: { stop_id?: string; estado?: string; action?: string; route_id?: string } = {}
  try { body = await req.json() } catch { /* vacío */ }

  // Iniciar ruta: marca la salida REAL y recalcula las horas de llegada desde
  // el momento real (desplaza las ETAs estimadas por la diferencia con lo planeado).
  if (body.action === 'iniciar' && body.route_id) {
    const { data: ruta } = await db.from('delivery_routes')
      .select('id, chofer_id, hora_salida_plan, estado').eq('id', body.route_id).maybeSingle()
    if (!ruta || ruta.chofer_id !== driver.id) return NextResponse.json({ error: 'Esa ruta no es tuya' }, { status: 403 })
    const now = Date.now()
    const plan = ruta.hora_salida_plan ? new Date(ruta.hora_salida_plan).getTime() : now
    const deltaMs = now - plan
    const { data: stops } = await db.from('delivery_route_stops').select('id, eta, estado_entrega').eq('route_id', body.route_id)
    for (const s of stops || []) {
      if (s.eta && !['entregado', 'no_entregado'].includes(String(s.estado_entrega))) {
        await db.from('delivery_route_stops').update({ eta: new Date(new Date(s.eta).getTime() + deltaMs).toISOString() }).eq('id', s.id)
      }
    }
    await db.from('delivery_routes').update({ estado: 'en_ruta' }).eq('id', body.route_id)
    return NextResponse.json({ ok: true, iniciada: true })
  }

  const stopId = body.stop_id
  const estado = String(body.estado || '')
  if (!stopId || !ESTADOS_OK.includes(estado)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  // La parada debe pertenecer a una ruta de ESTE chofer
  const { data: stop } = await db.from('delivery_route_stops')
    .select('id, route_id, minorista_pedido_id, mayorista_pedido_id').eq('id', stopId).maybeSingle()
  if (!stop) return NextResponse.json({ error: 'Parada no encontrada' }, { status: 404 })
  const { data: ruta } = await db.from('delivery_routes')
    .select('id, chofer_id').eq('id', stop.route_id).maybeSingle()
  if (!ruta || ruta.chofer_id !== driver.id) {
    return NextResponse.json({ error: 'Esa entrega no es tuya' }, { status: 403 })
  }

  const now = new Date().toISOString()
  const upd: Record<string, any> = { estado_entrega: estado }
  if (estado === 'llego_cliente') upd.hora_llegada_real = now
  if (estado === 'entregado') upd.hora_entrega_real = now
  await db.from('delivery_route_stops').update(upd).eq('id', stopId)

  // Refleja el estado en el pedido de origen (minorista o mayorista)
  if (stop.minorista_pedido_id) {
    await db.from('minorista_pedidos').update({ estado_entrega: estado }).eq('id', stop.minorista_pedido_id)
  }
  if (stop.mayorista_pedido_id) {
    const may: Record<string, any> = { estado_entrega: estado }
    if (estado === 'entregado') may.hora_entrega_real = now
    await db.from('mayorista_pedidos').update(may).eq('id', stop.mayorista_pedido_id)
  }

  // Estado de la ruta: en_ruta al empezar; finalizada cuando no quedan pendientes
  const { data: hermanas } = await db.from('delivery_route_stops')
    .select('estado_entrega').eq('route_id', stop.route_id)
  const abiertas = (hermanas || []).filter((s: any) => ['pendiente', 'en_ruta', 'llego_cliente'].includes(String(s.estado_entrega)))
  const nuevoEstadoRuta = abiertas.length === 0 ? 'finalizada' : 'en_ruta'
  await db.from('delivery_routes').update({ estado: nuevoEstadoRuta }).eq('id', stop.route_id)

  return NextResponse.json({ ok: true, ruta_estado: nuevoEstadoRuta })
}
