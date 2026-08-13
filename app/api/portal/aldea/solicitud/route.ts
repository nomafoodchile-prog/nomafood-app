import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { contextoAldea } from '@/lib/aldea/permisos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/portal/aldea/solicitud
// body: { sucursal, items:[{product_id, cantidad, producto_nombre, unidad}], fecha_requerida, prioridad, observaciones }
export async function POST(req: NextRequest) {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()

  const ctx = await contextoAldea(db, user.id)
  if (!ctx) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const body = await req.json()
  const sucursal = String(body.sucursal || '')
  if (!ctx.sucursales.has(sucursal)) return NextResponse.json({ error: 'No puedes pedir para esta sucursal' }, { status: 403 })

  const items = (body.items || []).filter((i: any) => Number(i.cantidad) > 0)
  if (items.length === 0) return NextResponse.json({ error: 'Agrega al menos un producto con cantidad.' }, { status: 400 })

  // Folio correlativo por organización: AV-2026-#####
  const anio = String(body.anio || '').match(/^\d{4}$/) ? body.anio : '2026'
  const { count } = await db.from('aldea_solicitudes')
    .select('id', { count: 'exact', head: true }).eq('organizacion_id', ctx.organizacion_id)
  const folio = `AV-${anio}-${String((count || 0) + 1).padStart(5, '0')}`

  // Totales estimados (IVA 19% + despacho fijo RM, misma lógica que NOMMA)
  const DESPACHO = 3500
  const neto = items.reduce((s: number, i: any) => s + (Number(i.precio_caja) || 0) * Number(i.cantidad), 0)
  const iva = Math.round(neto * 0.19)
  const total = neto > 0 ? neto + iva + DESPACHO : 0

  const baseSol: any = {
    folio,
    mayorista_id: sucursal,
    organizacion_id: ctx.organizacion_id,
    creada_por: user.id,
    estado: 'solicitud_enviada',
    prioridad: ['baja', 'normal', 'alta'].includes(String(body.prioridad)) ? body.prioridad : 'normal',
    fecha_requerida: body.fecha_requerida || null,
    observaciones: body.observaciones ? String(body.observaciones).trim() : null,
  }
  const totalesSol = { neto: neto || null, iva: neto > 0 ? iva : null, despacho: neto > 0 ? DESPACHO : null, total: total || null }

  // Intenta con totales; si faltan esas columnas (SQL no corrido), reintenta sin ellas.
  let { data: sol, error } = await db.from('aldea_solicitudes').insert({ ...baseSol, ...totalesSol }).select('id, folio').single()
  if (error) {
    const retry = await db.from('aldea_solicitudes').insert(baseSol).select('id, folio').single()
    sol = retry.data; error = retry.error
  }
  if (error || !sol) return NextResponse.json({ error: 'No se pudo crear la solicitud.', detail: error?.message || null }, { status: 500 })

  const baseLineas = items.map((i: any) => ({
    solicitud_id: sol!.id,
    product_id: i.product_id,
    producto_nombre: i.producto_nombre || null,
    unidad: i.unidad || 'un',
    cantidad_solicitada: Number(i.cantidad),
  }))
  const extraLineas = items.map((i: any) => {
    const precioCaja = Number(i.precio_caja) || null
    return {
      unidad_venta: i.unidad_venta || null,
      unidades_por_caja: i.unidades_por_caja ? Number(i.unidades_por_caja) : null,
      precio_unitario: precioCaja,
      subtotal: precioCaja != null ? precioCaja * Number(i.cantidad) : null,
    }
  })
  // Intenta con columnas nuevas; si faltan, reintenta solo con las base. La solicitud ya existe igual.
  const full = baseLineas.map((l: any, idx: number) => ({ ...l, ...extraLineas[idx] }))
  const ins = await db.from('aldea_solicitud_items').insert(full)
  if (ins.error) await db.from('aldea_solicitud_items').insert(baseLineas)

  return NextResponse.json({ ok: true, id: sol.id, folio: sol.folio, total })
}
