import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCentralUser } from '@/lib/central/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
