import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }
const str = (v: unknown) => (v === '' || v === null || v === undefined) ? null : String(v)
type Row = Record<string, unknown>

async function getAuth() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return null
  const { data: p } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = (p?.role as string | undefined) || ''
  return CENTRAL_ROLES.includes(role) ? { id: user.id, email: user.email ?? null, role } : null
}

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: Row = {}
  try { body = await req.json() as Row } catch { /* sin body */ }
  const action = String(body.action || '')
  const db = createServerClient()

  // ── Registrar recepción → crea lotes + movimientos entrada_compra ──
  if (action === 'crear') {
    const proveedorId = str(body.proveedor_id)
    const bodegaId = str(body.bodega_id)
    const items = Array.isArray(body.items) ? (body.items as Row[]) : []
    if (!proveedorId) return NextResponse.json({ error: 'Falta el proveedor' }, { status: 400 })
    if (!bodegaId) return NextResponse.json({ error: 'Falta la bodega/cámara de destino' }, { status: 400 })
    const validos = items.filter(it => it.product_id && N(it.cantidad_recibida) > 0)
    if (validos.length === 0) return NextResponse.json({ error: 'Agrega al menos una línea con producto y cantidad recibida' }, { status: 400 })

    // Correlativo
    const { count } = await db.from('recepciones').select('id', { count: 'exact', head: true })
    const numero = 'RC-' + String((count ?? 0) + 1).padStart(6, '0')

    const { data: rec, error: eRec } = await db.from('recepciones').insert({
      numero, proveedor_id: proveedorId, solicitud_id: str(body.solicitud_id), bodega_id: bodegaId,
      documento_url: str(body.documento_url), observaciones: str(body.observaciones),
      usuario_id: auth.id, usuario_email: auth.email,
    }).select('id').single()
    if (eRec || !rec) return NextResponse.json({ error: eRec?.message || 'No se pudo crear la recepción' }, { status: 500 })

    // Por cada línea: crea lote + movimiento entrada_compra + registra línea + precio
    for (const it of validos) {
      const pid = String(it.product_id)
      const qty = N(it.cantidad_recibida)
      const unidad = str(it.unidad)
      const calidad = String(it.estado_calidad || 'disponible')
      // Estado de calidad al recibir
      const disp = calidad === 'disponible' ? qty : 0
      const ret = calidad === 'retenido' ? qty : 0
      const bloq = calidad === 'bloqueado' ? qty : 0
      const estadoLote = bloq > 0 ? 'bloqueado' : ret > 0 ? 'retenido' : 'disponible'

      const { data: lote } = await db.from('inventario_lotes').insert({
        product_id: pid, lote_codigo: str(it.lote_codigo), es_externo: true,
        fecha_vencimiento: it.fecha_vencimiento || null, bodega_id: bodegaId, unidad,
        stock_inicial: qty, stock_disponible: disp, stock_retenido: ret, stock_bloqueado: bloq,
        estado: estadoLote, usuario_id: auth.id,
      }).select('id').single()

      if (lote) {
        await db.from('inventario_movimientos').insert({
          lote_id: lote.id, product_id: pid, tipo_movimiento: 'entrada_compra', cantidad: qty, unidad,
          motivo: `Recepción ${numero}`, bodega_destino_id: bodegaId, compra_id: rec.id,
          usuario_id: auth.id, usuario_email: auth.email,
          observacion: str(body.observaciones),
        })
      }

      const precio = it.precio_unitario != null && it.precio_unitario !== '' ? N(it.precio_unitario) : null
      await db.from('recepcion_items').insert({
        recepcion_id: rec.id, product_id: pid, cantidad_pedida: it.cantidad_pedida != null ? N(it.cantidad_pedida) : null,
        cantidad_recibida: qty, lote_codigo: str(it.lote_codigo), fecha_vencimiento: it.fecha_vencimiento || null,
        estado_calidad: calidad, unidad, precio_unitario: precio,
      })

      // Actualiza último precio del proveedor-producto + historial
      if (precio != null) {
        const { data: pp } = await db.from('proveedor_productos').select('id')
          .eq('product_id', pid).eq('proveedor_id', proveedorId).maybeSingle()
        const hoy = new Date().toISOString().slice(0, 10)
        if (pp?.id) {
          await db.from('proveedor_productos').update({ ultimo_precio: precio, fecha_ultimo_precio: hoy }).eq('id', pp.id)
        }
        await db.from('proveedor_precio_historial').insert({
          proveedor_producto_id: pp?.id ?? null, product_id: pid, proveedor_id: proveedorId,
          precio, origen: 'recepcion',
        })
      }
    }

    // Si vino de una solicitud, márcala recibida
    if (str(body.solicitud_id)) {
      await db.from('solicitudes_compra').update({ estado: 'recibida', updated_at: new Date().toISOString() }).eq('id', str(body.solicitud_id))
    }

    return NextResponse.json({ ok: true, numero, recepcion_id: rec.id })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
