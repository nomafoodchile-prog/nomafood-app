import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']
const CODIGO = 'DEMO-TUTOS'

// Ingredientes de la receta demo (por 1 tanda = 300 unidades). Cada uno es una
// materia prima; si no existe como producto, se crea.
const INSUMOS = [
  { nombre: 'Proteína de soya texturizada (insumo)', sku: 'MP-SOYA', unidad: 'kg', precio: 4100, cant: 5 },
  { nombre: 'Harina de trigo (insumo)',              sku: 'MP-HARINA', unidad: 'kg', precio: 900,  cant: 3 },
  { nombre: 'Apanado condimentado (insumo)',         sku: 'MP-APANADO', unidad: 'kg', precio: 1800, cant: 1.5 },
  { nombre: 'Condimento Chickent (insumo)',          sku: 'MP-COND', unidad: 'kg', precio: 5200, cant: 0.4 },
  { nombre: 'Aceite vegetal (insumo)',               sku: 'MP-ACEITE', unidad: 'L',  precio: 1600, cant: 2 },
]
const PASOS = [
  'Hidratar la proteína de soya en agua tibia por 20 min. Escurrir bien.',
  'Mezclar la soya escurrida con el condimento Chickent hasta integrar.',
  'Porcionar en tutos de tamaño uniforme.',
  'Apanar cada tuto en la harina y luego en el apanado condimentado.',
  'Freír en aceite a 170°C hasta dorar (o hornear según especificación).',
  'Enfriar, pesar el resultado y registrar la merma en el cierre.',
]

export async function POST() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()
  const { data: me } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!ADMIN_ROLES.includes(String(me?.role || ''))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  // Idempotente: si ya existe la receta demo, no la duplica
  const { data: ya } = await db.from('recetas').select('id').eq('codigo', CODIGO).maybeSingle()
  if (ya?.id) return NextResponse.json({ ok: true, ya: true, receta_id: ya.id })

  // 1) Asegurar los productos-insumo (materia prima)
  const ingProductIds: { producto_id: string; cant: number; unidad: string }[] = []
  let lastInsErr = ''
  for (const ins of INSUMOS) {
    let { data: prod } = await db.from('products').select('id').eq('nombre', ins.nombre).maybeSingle()
    if (!prod?.id) {
      const { data: creado, error: eProd } = await db.from('products').insert({
        nombre: ins.nombre, sku: ins.sku, tipo_producto: 'materia_prima', estado_ciclo: 'borrador',
        unidad: ins.unidad, unidad_venta: null, precio: ins.precio, stock_actual: 0,
        visible_catalogo: false, activo: true, categoria: 'Insumos',
      }).select('id').single()
      if (eProd) lastInsErr = eProd.message
      prod = creado
    }
    if (prod?.id) ingProductIds.push({ producto_id: prod.id, cant: ins.cant, unidad: ins.unidad })
  }
  if (ingProductIds.length === 0) return NextResponse.json({ error: 'No se pudieron crear los insumos.', detalle: lastInsErr }, { status: 500 })

  // 2) Receta
  const { data: receta, error: eR } = await db.from('recetas').insert({
    codigo: CODIGO, nombre: 'Chickent Tutos', tipo_receta: 'producto_terminado',
    area: 'Cocina caliente', descripcion: 'Receta de ejemplo para demostración del flujo de producción.',
    created_by: user.id,
  }).select('id').single()
  if (eR || !receta) return NextResponse.json({ error: 'No se pudo crear la receta. ' + (eR?.message || '') }, { status: 500 })

  // 3) Versión aprobada con rendimiento (1 tanda = 300 unidades)
  const { data: version, error: eV } = await db.from('receta_versiones').insert({
    receta_id: receta.id, version: 1, estado: 'aprobada',
    rendimiento_cantidad: 300, rendimiento_unidad: 'unidades', merma_operativa_pct: 5,
  }).select('id').single()
  if (eV || !version) return NextResponse.json({ error: 'No se pudo crear la versión. ' + (eV?.message || '') }, { status: 500 })

  // 4) Ingredientes (por tanda) + 5) pasos
  await db.from('receta_ingredientes').insert(ingProductIds.map((ing, i) => ({
    version_id: version.id, producto_id: ing.producto_id, tipo_componente: 'materia_prima',
    cantidad: ing.cant, unidad: ing.unidad, orden: i + 1,
  })))
  await db.from('receta_pasos').insert(PASOS.map((txt, i) => ({
    version_id: version.id, numero: i + 1, instruccion: txt, area: 'Cocina caliente', orden: i + 1,
  })))

  // 6) Activar la versión en la receta
  await db.from('recetas').update({ version_activa_id: version.id }).eq('id', receta.id)

  return NextResponse.json({ ok: true, receta_id: receta.id, version_id: version.id })
}
