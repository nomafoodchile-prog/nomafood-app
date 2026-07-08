import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']
const num = (v: unknown) => { if (v === '' || v === null || v === undefined) return null; const n = Number(v); return Number.isNaN(n) ? null : n }
const str = (v: unknown) => (v === '' || v === null || v === undefined) ? null : String(v)

// Campos de texto de la ficha proveedor (generales + condiciones + evaluación)
const PROV_TEXT = [
  'nombre', 'rut', 'contacto', 'telefono', 'email', 'direccion', 'observaciones',
  'razon_social', 'nombre_comercial', 'giro', 'direccion_tributaria', 'comuna', 'ciudad',
  'contacto_comercial', 'contacto_despacho', 'contacto_cobranza', 'whatsapp',
  'email_pedidos', 'email_facturacion', 'sitio_web', 'estado',
  'forma_pago', 'plazo_pago', 'dias_despacho', 'horario_atencion', 'condiciones_especiales',
  'nivel_confianza', 'comentarios_evaluacion',
]
const PROV_NUM = ['pedido_minimo', 'tiempo_entrega_dias', 'eval_puntualidad', 'eval_calidad', 'eval_precio', 'eval_cumplimiento', 'incidencias', 'devoluciones']
const PROV_BOOL = ['despacha_a_planta', 'requiere_retiro_chofer', 'emite_factura', 'permite_sin_factura', 'activo']

async function esAdmin(): Promise<boolean> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return false
  const { data: p } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  return CENTRAL_ROLES.includes((p?.role as string | undefined) || '')
}

export async function POST(req: NextRequest) {
  if (!(await esAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: Record<string, unknown> = {}
  try { body = await req.json() as Record<string, unknown> } catch { /* sin body */ }
  const action = String(body.action || '')
  const db = createServerClient()

  if (action === 'crear_proveedor') {
    const nombre = String(body.nombre || '').trim()
    if (!nombre) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    const ins: Record<string, unknown> = { nombre }
    for (const k of PROV_TEXT) if (k in body && k !== 'nombre') ins[k] = str(body[k])
    for (const k of PROV_NUM) if (k in body) ins[k] = num(body[k])
    for (const k of PROV_BOOL) if (k in body) ins[k] = Boolean(body[k])
    const { data, error } = await db.from('proveedores').insert(ins).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: data.id })
  }

  if (action === 'vincular') {
    const productId = String(body.product_id || '')
    const proveedorId = String(body.proveedor_id || '')
    if (!productId || !proveedorId) return NextResponse.json({ error: 'Falta producto o proveedor' }, { status: 400 })
    const principal = Boolean(body.es_principal)
    if (principal) await db.from('proveedor_productos').update({ es_principal: false }).eq('product_id', productId)
    const ultimoPrecio = num(body.ultimo_precio)
    const { data: pp, error } = await db.from('proveedor_productos').upsert({
      product_id: productId, proveedor_id: proveedorId, es_principal: principal,
      es_alternativo: Boolean(body.es_alternativo),
      activo: 'activo' in body ? Boolean(body.activo) : true,
      codigo_proveedor: str(body.codigo_proveedor),
      unidad_compra: str(body.unidad_compra),
      equivalencia_inventario: num(body.equivalencia_inventario),
      cantidad_minima: num(body.cantidad_minima), precio_referencial: num(body.precio_referencial),
      ultimo_precio: ultimoPrecio, plazo_entrega_dias: num(body.plazo_entrega_dias),
      fecha_ultimo_precio: ultimoPrecio !== null ? new Date().toISOString().slice(0, 10) : (str(body.fecha_ultimo_precio)),
      observaciones: str(body.observaciones),
    }, { onConflict: 'product_id,proveedor_id' }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Registra el precio en el historial (para variación de precios)
    if (ultimoPrecio !== null && pp?.id) {
      await db.from('proveedor_precio_historial').insert({
        proveedor_producto_id: pp.id, product_id: productId, proveedor_id: proveedorId,
        precio: ultimoPrecio, origen: 'manual',
      })
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'actualizar_proveedor') {
    const id = String(body.id || '')
    if (!id) return NextResponse.json({ error: 'Falta el proveedor' }, { status: 400 })
    const patch: Record<string, unknown> = {}
    for (const k of PROV_TEXT) if (k in body) patch[k] = str(body[k])
    for (const k of PROV_NUM) if (k in body) patch[k] = num(body[k])
    for (const k of PROV_BOOL) if (k in body) patch[k] = Boolean(body[k])
    // estado y activo van de la mano
    if ('estado' in body) patch.activo = String(body.estado) === 'activo'
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
    const { error } = await db.from('proveedores').update(patch).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'eliminar_vinculo') {
    const id = String(body.id || '')
    if (!id) return NextResponse.json({ error: 'Falta el vínculo' }, { status: 400 })
    const { error } = await db.from('proveedor_productos').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
