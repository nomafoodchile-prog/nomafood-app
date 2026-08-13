import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { contextoAldea } from '@/lib/aldea/permisos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/portal/aldea/pedidos?sucursal=<mayorista_id>
// Lista las solicitudes de la sucursal con sus líneas (trazabilidad por producto).
export async function GET(req: NextRequest) {
  const DEBUG = req.nextUrl.searchParams.get('debug') === '1'
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado', paso: DEBUG ? 'sin_user' : undefined }, { status: DEBUG ? 200 : 401 })
  const db = createServerClient()

  const ctx = await contextoAldea(db, user.id)
  if (!ctx) return NextResponse.json({ error: 'Sin acceso', paso: DEBUG ? 'sin_ctx' : undefined, userId: DEBUG ? user.id : undefined }, { status: DEBUG ? 200 : 403 })

  const sucursalParam = req.nextUrl.searchParams.get('sucursal')
  const sucursal = sucursalParam || [...ctx.sucursales][0]
  if (!sucursal || !ctx.sucursales.has(sucursal)) {
    if (DEBUG) return NextResponse.json({ paso: 'sucursal_no_permitida', sucursalParam, sucursalUsada: sucursal, ctxSucursales: [...ctx.sucursales], org: ctx.organizacion_id })
    return NextResponse.json({ error: 'No puedes ver esta sucursal' }, { status: 403 })
  }

  const COLS_FULL = 'id, folio, estado, prioridad, fecha_requerida, observaciones, chofer_nombre, chofer_telefono, hora_estimada, neto, total, created_at'
  const COLS_BASE = 'id, folio, estado, prioridad, fecha_requerida, observaciones, created_at'
  const q = (cols: string) => db.from('aldea_solicitudes')
    .select(cols).eq('mayorista_id', sucursal).order('created_at', { ascending: false }).limit(50)
  // Degradación: si falta alguna columna nueva (SQL no corrido), no dejamos la lista vacía.
  let { data: sols, error: solErr } = await q(COLS_FULL)
  if (solErr) { const r = await q(COLS_BASE); sols = r.data }

  const ids = (sols || []).map(s => s.id)
  const itemsBySol = new Map<string, any[]>()
  if (ids.length) {
    const { data: items } = await db.from('aldea_solicitud_items')
      .select('id, solicitud_id, producto_nombre, unidad, cantidad_solicitada, cantidad_aprobada, cantidad_preparada, cantidad_despachada, cantidad_recibida')
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

  if (DEBUG) return NextResponse.json({
    paso: 'ok', sucursalParam, sucursalUsada: sucursal,
    ctxSucursales: [...ctx.sucursales], org: ctx.organizacion_id,
    filasEncontradas: (sols || []).length, solErr: solErr?.message || null,
    pedidos,
  })
  return NextResponse.json({ pedidos })
}
