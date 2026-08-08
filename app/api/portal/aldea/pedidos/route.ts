import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { contextoAldea } from '@/lib/aldea/permisos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/portal/aldea/pedidos?sucursal=<mayorista_id>
// Lista las solicitudes de la sucursal con sus líneas (trazabilidad por producto).
export async function GET(req: NextRequest) {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()

  const ctx = await contextoAldea(db, user.id)
  if (!ctx) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const sucursal = req.nextUrl.searchParams.get('sucursal') || [...ctx.sucursales][0]
  if (!sucursal || !ctx.sucursales.has(sucursal)) return NextResponse.json({ error: 'No puedes ver esta sucursal' }, { status: 403 })

  const { data: sols } = await db.from('aldea_solicitudes')
    .select('id, folio, estado, prioridad, fecha_requerida, observaciones, created_at')
    .eq('mayorista_id', sucursal).order('created_at', { ascending: false }).limit(50)

  const ids = (sols || []).map(s => s.id)
  const itemsBySol = new Map<string, any[]>()
  if (ids.length) {
    const { data: items } = await db.from('aldea_solicitud_items')
      .select('solicitud_id, producto_nombre, unidad, cantidad_solicitada, cantidad_aprobada, cantidad_preparada, cantidad_despachada, cantidad_recibida')
      .in('solicitud_id', ids)
    for (const it of items || []) {
      const arr = itemsBySol.get(it.solicitud_id) || []; arr.push(it); itemsBySol.set(it.solicitud_id, arr)
    }
  }

  const pedidos = (sols || []).map(s => {
    const items = itemsBySol.get(s.id) || []
    // Diferencia detectada = alguna línea con recibida < despachada
    const conDiferencia = items.some(i => i.cantidad_recibida != null && i.cantidad_despachada != null && Number(i.cantidad_recibida) < Number(i.cantidad_despachada))
    return { ...s, items, n_items: items.length, con_diferencia: conDiferencia }
  })

  return NextResponse.json({ pedidos })
}
