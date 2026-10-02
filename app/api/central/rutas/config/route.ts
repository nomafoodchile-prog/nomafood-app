import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCentralUser } from '@/lib/central/guard'
import { geocodeDireccion } from '@/lib/geo/nominatim'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

type DB = ReturnType<typeof createServerClient>

// Guarda una clave en app_config sin depender de una restricción única:
// intenta UPDATE y, si no existe, INSERT.
async function setConfig(db: DB, clave: string, valor: string) {
  const { data } = await db.from('app_config').update({ valor }).eq('clave', clave).select('clave')
  if (!data || data.length === 0) await db.from('app_config').insert({ clave, valor })
}

// GET /api/central/rutas/config → configuración de despacho (origen + horario)
export async function GET() {
  const { isAdmin } = await getCentralUser()
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const { data } = await db.from('app_config').select('clave, valor')
    .in('clave', ['despacho_origen_nombre', 'despacho_origen_lat', 'despacho_origen_lng', 'despacho_hora_salida', 'despacho_service_min'])
  const c = Object.fromEntries((data || []).map(r => [r.clave, r.valor]))
  return NextResponse.json({
    ok: true,
    origen_nombre: c['despacho_origen_nombre'] || 'Centro de despacho',
    origen_lat: c['despacho_origen_lat'] ? Number(c['despacho_origen_lat']) : null,
    origen_lng: c['despacho_origen_lng'] ? Number(c['despacho_origen_lng']) : null,
    hora_salida: c['despacho_hora_salida'] || '10:00',
    service_min: Number(c['despacho_service_min'] || 8),
  })
}

// POST /api/central/rutas/config → actualiza origen (dirección se geocodifica),
// hora de salida y minutos por entrega. Todo opcional; solo cambia lo que llega.
export async function POST(req: NextRequest) {
  const { isAdmin } = await getCentralUser()
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: { origen_direccion?: string; hora_salida?: string; service_min?: number } = {}
  try { body = await req.json() } catch { /* vacío */ }

  const db = createServerClient()
  let geo: { lat: number; lng: number } | null = null

  if (body.origen_direccion && body.origen_direccion.trim()) {
    const hit = await geocodeDireccion(body.origen_direccion.trim())
    if (!hit) {
      return NextResponse.json({ ok: false, error: 'No se pudo ubicar esa dirección de salida. Revisa calle, número y comuna.' }, { status: 200 })
    }
    geo = { lat: hit.lat, lng: hit.lng }
    await setConfig(db, 'despacho_origen_nombre', body.origen_direccion.trim())
    await setConfig(db, 'despacho_origen_lat', String(hit.lat))
    await setConfig(db, 'despacho_origen_lng', String(hit.lng))
  }
  if (body.hora_salida) await setConfig(db, 'despacho_hora_salida', String(body.hora_salida))
  if (body.service_min != null) await setConfig(db, 'despacho_service_min', String(body.service_min))

  return NextResponse.json({ ok: true, geo })
}
