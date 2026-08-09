import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { contextoAldea } from '@/lib/aldea/permisos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/portal/aldea/recepcion
// body: { solicitud_id, items:[{id, cantidad_recibida}], notas }
// - guarda lo recibido, SUMA al stock del local por lo RECIBIDO (no lo despachado),
//   y si hay diferencia (recibido < despachado) genera una incidencia automática.
export async function POST(req: NextRequest) {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()

  const ctx = await contextoAldea(db, user.id)
  if (!ctx) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const body = await req.json()
  const solId = String(body.solicitud_id || '')
  const { data: sol } = await db.from('aldea_solicitudes')
    .select('id, mayorista_id, organizacion_id, estado').eq('id', solId).maybeSingle()
  if (!sol) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  if (!ctx.sucursales.has(sol.mayorista_id)) return NextResponse.json({ error: 'No puedes recibir esta solicitud' }, { status: 403 })

  const { data: items } = await db.from('aldea_solicitud_items')
    .select('id, product_id, producto_nombre, cantidad_despachada').eq('solicitud_id', solId)
  const itemMap = new Map((items || []).map(i => [i.id, i]))
  const recibidoMap = new Map<string, number>()
  for (const r of (body.items || [])) recibidoMap.set(String(r.id), Math.max(0, Number(r.cantidad_recibida) || 0))

  let hayDiferencia = false
  const diffTxt: string[] = []

  for (const it of items || []) {
    const recibido = recibidoMap.has(it.id) ? recibidoMap.get(it.id)! : (Number(it.cantidad_despachada) || 0)
    // 1) guardar recibido
    await db.from('aldea_solicitud_items').update({ cantidad_recibida: recibido }).eq('id', it.id)
    // 2) sumar al stock del local por lo RECIBIDO
    if (recibido > 0 && it.product_id) {
      const { data: st } = await db.from('aldea_stock').select('id, stock_actual, por_recibir')
        .eq('mayorista_id', sol.mayorista_id).eq('product_id', it.product_id).maybeSingle()
      if (st) {
        const nuevoPorRecibir = Math.max(0, Number(st.por_recibir || 0) - recibido)
        await db.from('aldea_stock').update({ stock_actual: Number(st.stock_actual || 0) + recibido, por_recibir: nuevoPorRecibir, updated_at: new Date().toISOString() }).eq('id', st.id)
      } else {
        await db.from('aldea_stock').insert({ mayorista_id: sol.mayorista_id, product_id: it.product_id, stock_actual: recibido, stock_min: 0, stock_ideal: 0, fuente: 'nomma' })
      }
    }
    // 3) detectar diferencia vs despachado
    const desp = Number(it.cantidad_despachada)
    if (it.cantidad_despachada != null && recibido !== desp) {
      hayDiferencia = true
      diffTxt.push(`${it.producto_nombre || 'Producto'}: despachado ${desp}, recibido ${recibido} (${recibido - desp > 0 ? '+' : ''}${recibido - desp})`)
    }
  }

  // 4) estado de la solicitud
  await db.from('aldea_solicitudes').update({
    estado: hayDiferencia ? 'entregada_diferencias' : 'entregada',
    updated_at: new Date().toISOString(),
  }).eq('id', solId)

  // 5) incidencia automática por diferencia
  if (hayDiferencia) {
    await db.from('aldea_incidencias').insert({
      mayorista_id: sol.mayorista_id,
      organizacion_id: sol.organizacion_id,
      solicitud_id: solId,
      tipo: 'diferencia_recepcion',
      descripcion: `Diferencia en la recepción. ${diffTxt.join(' · ')}${body.notas ? ` · Nota: ${String(body.notas).trim()}` : ''}`,
      creada_por: user.id,
    })
  }

  return NextResponse.json({ ok: true, diferencia: hayDiferencia })
}
