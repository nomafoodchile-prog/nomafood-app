import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']
// Campos de seguridad alimentaria: solo SuperAdmin puede DESACTIVARlos en terminados
const SEGURIDAD = ['maneja_lote', 'maneja_vencimiento', 'requiere_fechado', 'requiere_etiqueta']

type Tipo = 'text' | 'number' | 'bool'
interface Campo { col: string; tipo: Tipo }

// Columnas editables (whitelist). NO incluye: marca (fija), factor_conversion
// (calculado), estado_calidad (viene de lotes en Inventario).
const CAMPOS: Campo[] = [
  { col: 'nombre', tipo: 'text' }, { col: 'sku', tipo: 'text' },
  { col: 'categoria', tipo: 'text' }, { col: 'subcategoria', tipo: 'text' },
  { col: 'tipo_producto', tipo: 'text' }, { col: 'estado_ciclo', tipo: 'text' },
  { col: 'descripcion', tipo: 'text' }, { col: 'foto_oficial_url', tipo: 'text' },
  { col: 'maneja_lote', tipo: 'bool' }, { col: 'maneja_vencimiento', tipo: 'bool' },
  { col: 'codigo_tipo', tipo: 'text' }, { col: 'codigo_valor', tipo: 'text' },
  { col: 'activo', tipo: 'bool' },
  { col: 'unidad_venta', tipo: 'text' }, { col: 'cantidad_por_unidad_venta', tipo: 'number' },
  { col: 'unidad_inventario', tipo: 'text' },
  { col: 'precio', tipo: 'number' }, { col: 'pedido_minimo', tipo: 'number' },
  { col: 'visible_catalogo', tipo: 'bool' },
  { col: 'receta_estado', tipo: 'text' }, { col: 'receta_version', tipo: 'text' },
  { col: 'rendimiento_lote', tipo: 'number' }, { col: 'rendimiento_unidad', tipo: 'text' },
  { col: 'tiempo_produccion_min', tipo: 'number' }, { col: 'merma_esperada_pct', tipo: 'number' },
  { col: 'modalidad_produccion', tipo: 'text' }, { col: 'area_responsable', tipo: 'text' },
  { col: 'stock_min', tipo: 'number' }, { col: 'stock_max', tipo: 'number' },
  { col: 'punto_reposicion', tipo: 'number' }, { col: 'ubicacion', tipo: 'text' },
  { col: 'condicion_almacenamiento', tipo: 'text' }, { col: 'vida_util_dias', tipo: 'number' },
  { col: 'dias_min_despacho', tipo: 'number' },
  { col: 'ubicacion_picking', tipo: 'text' }, { col: 'tipo_embalaje', tipo: 'text' },
  { col: 'peso_aprox_kg', tipo: 'number' }, { col: 'bultos_estimados', tipo: 'number' },
  { col: 'instrucciones_manipulacion', tipo: 'text' },
  { col: 'requiere_fechado', tipo: 'bool' }, { col: 'requiere_etiqueta', tipo: 'bool' },
  { col: 'costo_envase', tipo: 'number' }, { col: 'costo_mano_obra', tipo: 'number' },
  { col: 'costo_receta', tipo: 'number' }, { col: 'costo_total', tipo: 'number' },
  { col: 'margen_bruto', tipo: 'number' },
]

function coerce(tipo: Tipo, v: unknown): string | number | boolean | null {
  if (v === '' || v === null || v === undefined) return tipo === 'bool' ? false : null
  if (tipo === 'number') { const n = Number(v); return Number.isNaN(n) ? null : n }
  if (tipo === 'bool') return Boolean(v)
  return String(v)
}

// factor de conversión = cantidad por unidad de venta cuando la unidad de venta
// difiere de la de inventario; si son iguales o faltan, 1.
function calcFactor(uv: unknown, ui: unknown, cant: unknown): number {
  const c = Number(cant) || 1
  return (uv && ui && String(uv) !== String(ui)) ? c : 1
}

async function getAuth(): Promise<{ id: string; email: string | null; role: string } | null> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return null
  const { data: profile } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = (profile?.role as string | undefined) || ''
  if (!CENTRAL_ROLES.includes(role)) return null
  return { id: user.id, email: user.email ?? null, role }
}

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: { action?: string; id?: string; fields?: Record<string, unknown> } = {}
  try { body = await req.json() } catch { /* sin body */ }
  const f = body.fields || {}
  const db = createServerClient()

  if (body.action === 'create') {
    const nombre = String(f.nombre || '').trim()
    if (!nombre || f.precio === undefined || f.precio === '') {
      return NextResponse.json({ error: 'El nombre y el precio son obligatorios' }, { status: 400 })
    }
    const tipo = f.tipo_producto ? String(f.tipo_producto) : 'terminado_fabricado'
    const esFood = tipo === 'terminado_fabricado'
    const unidadVenta = f.unidad_venta ? String(f.unidad_venta) : null
    const { data, error } = await db.from('products').insert({
      nombre,
      sku:           f.sku ? String(f.sku).trim() : null,
      categoria:     f.categoria ? String(f.categoria).trim() : null,
      tipo_producto: tipo,
      estado_ciclo:  'borrador',
      unidad_venta:  unidadVenta,
      unidad:        unidadVenta || 'un',
      precio:        Number(f.precio),
      stock_actual:  0,
      activo:        true,
      // Seguridad alimentaria por defecto en terminados
      maneja_lote:        esFood, maneja_vencimiento: esFood,
      requiere_fechado:   esFood, requiere_etiqueta:  esFood,
    }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await db.from('product_price_history').insert({ product_id: data.id, precio_neto: Number(f.precio), usuario_id: auth.id, usuario_email: auth.email })
    return NextResponse.json({ ok: true, id: data.id })
  }

  if (body.action === 'update') {
    if (!body.id) return NextResponse.json({ error: 'Falta el producto' }, { status: 400 })
    const { data: actual } = await db.from('products').select('*').eq('id', body.id).maybeSingle()
    if (!actual) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    const prev = actual as Record<string, unknown>
    const tipoEfectivo = f.tipo_producto ? String(f.tipo_producto) : String(prev.tipo_producto || '')

    const patch: Record<string, unknown> = {}
    const audit: Array<{ product_id: string; usuario_id: string; usuario_email: string | null; campo: string; valor_anterior: string | null; valor_nuevo: string | null }> = []
    let precioNuevo: number | null = null

    for (const c of CAMPOS) {
      if (!(c.col in f)) continue
      const nuevo = coerce(c.tipo, f[c.col])
      const viejo = prev[c.col] ?? null
      if (String(viejo ?? '') === String(nuevo ?? '')) continue

      // Candado de seguridad alimentaria: desactivar en terminado solo SuperAdmin
      if (SEGURIDAD.includes(c.col) && viejo === true && nuevo === false && tipoEfectivo === 'terminado_fabricado' && auth.role !== 'SuperAdmin') {
        return NextResponse.json({ error: 'Solo un SuperAdmin puede desactivar lote, vencimiento, fechado o etiqueta en productos terminados.' }, { status: 403 })
      }

      patch[c.col] = nuevo
      audit.push({ product_id: body.id, usuario_id: auth.id, usuario_email: auth.email, campo: c.col, valor_anterior: viejo === null ? null : String(viejo), valor_nuevo: nuevo === null ? null : String(nuevo) })
      if (c.col === 'precio' && typeof nuevo === 'number') precioNuevo = nuevo
    }

    // Recalcular factor de conversión (derivado, solo lectura para el usuario)
    if ('unidad_venta' in patch || 'unidad_inventario' in patch || 'cantidad_por_unidad_venta' in patch) {
      const uv = patch.unidad_venta ?? prev.unidad_venta
      const ui = patch.unidad_inventario ?? prev.unidad_inventario
      const cant = patch.cantidad_por_unidad_venta ?? prev.cantidad_por_unidad_venta
      patch.factor_conversion = calcFactor(uv, ui, cant)
    }
    // Mantener la columna legacy `unidad` sincronizada (compat portal)
    if (typeof patch.unidad_venta === 'string' && patch.unidad_venta) patch.unidad = patch.unidad_venta

    if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true, sinCambios: true })

    const { error } = await db.from('products').update(patch).eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (precioNuevo !== null) {
      await db.from('product_price_history').update({ vigente_hasta: new Date().toISOString() }).eq('product_id', body.id).is('vigente_hasta', null)
      await db.from('product_price_history').insert({ product_id: body.id, precio_neto: precioNuevo, usuario_id: auth.id, usuario_email: auth.email })
    }
    if (audit.length > 0) await db.from('product_audit_log').insert(audit)

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
