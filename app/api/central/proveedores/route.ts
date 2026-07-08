import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']
const num = (v: unknown) => { if (v === '' || v === null || v === undefined) return null; const n = Number(v); return Number.isNaN(n) ? null : n }

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
    const { data, error } = await db.from('proveedores').insert({
      nombre, rut: body.rut ? String(body.rut) : null, contacto: body.contacto ? String(body.contacto) : null,
      telefono: body.telefono ? String(body.telefono) : null, email: body.email ? String(body.email) : null,
      direccion: body.direccion ? String(body.direccion) : null,
    }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: data.id })
  }

  if (action === 'vincular') {
    const productId = String(body.product_id || '')
    const proveedorId = String(body.proveedor_id || '')
    if (!productId || !proveedorId) return NextResponse.json({ error: 'Falta producto o proveedor' }, { status: 400 })
    const principal = Boolean(body.es_principal)
    if (principal) await db.from('proveedor_productos').update({ es_principal: false }).eq('product_id', productId)
    const { error } = await db.from('proveedor_productos').upsert({
      product_id: productId, proveedor_id: proveedorId, es_principal: principal,
      codigo_proveedor: body.codigo_proveedor ? String(body.codigo_proveedor) : null,
      unidad_compra: body.unidad_compra ? String(body.unidad_compra) : null,
      cantidad_minima: num(body.cantidad_minima), precio_referencial: num(body.precio_referencial),
      ultimo_precio: num(body.ultimo_precio), plazo_entrega_dias: num(body.plazo_entrega_dias),
      observaciones: body.observaciones ? String(body.observaciones) : null,
    }, { onConflict: 'product_id,proveedor_id' })
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
