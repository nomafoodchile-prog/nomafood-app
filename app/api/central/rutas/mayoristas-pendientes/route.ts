import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCentralUser } from '@/lib/central/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/central/rutas/mayoristas-pendientes
// Pedidos mayoristas que se pueden sumar a una ruta de despacho: no cancelados,
// no entregados, y que no estén ya en una parada de ruta.
export async function GET() {
  const { isAdmin } = await getCentralUser()
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()

  const { data: peds, error } = await db
    .from('mayorista_pedidos')
    .select('id, numero_pedido, total, bultos, direccion_entrega, telefono_entrega, lat, lng, estado, estado_entrega, mayorista_id')
    .neq('estado', 'cancelado')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Excluir los que ya están en alguna parada de ruta
  const { data: enRuta } = await db.from('delivery_route_stops').select('mayorista_pedido_id').not('mayorista_pedido_id', 'is', null)
  const yaEnRuta = new Set((enRuta || []).map((r: any) => r.mayorista_pedido_id))

  const disponibles = (peds || []).filter((p: any) =>
    String(p.estado_entrega || 'pendiente') !== 'entregado' && !yaEnRuta.has(p.id))

  // Nombres de los mayoristas
  const ids = Array.from(new Set(disponibles.map((p: any) => p.mayorista_id).filter(Boolean)))
  const { data: mays } = ids.length
    ? await db.from('mayoristas').select('id, nombre, empresa').in('id', ids)
    : { data: [] as any[] }
  const nombre = new Map((mays || []).map((m: any) => [m.id, m.empresa || m.nombre || 'Mayorista']))

  const pedidos = disponibles.map((p: any) => ({
    id: p.id,
    numero: p.numero_pedido,
    cliente: nombre.get(p.mayorista_id) || 'Mayorista',
    direccion: p.direccion_entrega,
    telefono: p.telefono_entrega,
    lat: p.lat, lng: p.lng,
    total: p.total, bultos: p.bultos,
    tiene_coords: p.lat != null && p.lng != null,
  }))

  return NextResponse.json({ ok: true, pedidos })
}
