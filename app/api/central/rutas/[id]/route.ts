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
