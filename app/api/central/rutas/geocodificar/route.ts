import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCentralUser } from '@/lib/central/guard'
import { geocodeDireccion } from '@/lib/geo/nominatim'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/central/rutas/geocodificar  { ids: string[], soloFaltantes?: boolean }
// Ubica en el mapa (lat/lng) los pedidos minorista seleccionados usando su
// dirección de despacho. Guarda la precisión en geo_status:
//   'ok' (exacta/calle)  ·  'revisar' (no se pudo / muy impreciso)
// No altera la dirección original; guarda la usada en dir_normalizada.
export async function POST(req: NextRequest) {
  const { isAdmin } = await getCentralUser()
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: { ids?: string[]; soloFaltantes?: boolean } = {}
  try { body = await req.json() } catch { /* vacío */ }
  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : []
  if (ids.length === 0) return NextResponse.json({ error: 'Sin pedidos' }, { status: 400 })

  const db = createServerClient()
  const { data: pedidos, error } = await db
    .from('minorista_pedidos')
    .select('id, cliente_nombre, despacho_direccion, despacho_comuna, despacho_region, despacho_ciudad, lat, lng, geo_status')
    .in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const resultados: { id: string; geo_status: string; lat?: number; lng?: number; precision?: string }[] = []

  for (const p of pedidos || []) {
    // si ya tiene coordenadas y pedimos solo faltantes, lo dejamos
    if (body.soloFaltantes && p.lat != null && p.lng != null) {
      resultados.push({ id: p.id, geo_status: p.geo_status || 'ok', lat: p.lat, lng: p.lng })
      continue
    }
    const partes = [p.despacho_direccion, p.despacho_comuna, p.despacho_region || p.despacho_ciudad]
      .filter(Boolean).join(', ')
    const hit = partes ? await geocodeDireccion(partes) : null
    if (hit && hit.precision !== 'sector') {
      await db.from('minorista_pedidos').update({
        lat: hit.lat, lng: hit.lng, geo_status: 'ok', dir_normalizada: hit.display,
      }).eq('id', p.id)
      resultados.push({ id: p.id, geo_status: 'ok', lat: hit.lat, lng: hit.lng, precision: hit.precision })
    } else if (hit) {
      // solo resolvió el sector/comuna → sirve para ubicar aproximado pero se marca a revisar
      await db.from('minorista_pedidos').update({
        lat: hit.lat, lng: hit.lng, geo_status: 'revisar', dir_normalizada: hit.display,
      }).eq('id', p.id)
      resultados.push({ id: p.id, geo_status: 'revisar', lat: hit.lat, lng: hit.lng, precision: hit.precision })
    } else {
      await db.from('minorista_pedidos').update({ geo_status: 'revisar' }).eq('id', p.id)
      resultados.push({ id: p.id, geo_status: 'revisar' })
    }
  }

  return NextResponse.json({ ok: true, resultados })
}
