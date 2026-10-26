import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia']

// Solo lectura. Cuenta filas de las tablas sospechosas de estar duplicadas/muertas
// (esquema en inglés) y de sus equivalentes vivos (español), para planificar la
// limpieza de la Fase 0 sin riesgo. No modifica nada.
const SOSPECHOSAS_INGLES = [
  'recipes', 'recipe_ingredients', 'recipe_steps',
  'orders', 'order_lines',
  'supplier_products', 'supplier_price_history',
  'inventory_movements', 'inventory_catalog_items',
  'purchase_orders', 'purchase_requests', 'purchase_receipts',
  'production_orders', 'production_items',
  'customers', 'marketing_campaigns', 'marketing_customers',
  'campaign_templates', 'campaign_deliveries',
  'cash_entries', 'payments', 'warehouse_locations', 'stock_reservations',
  'adt_tasks', 'picking_tasks', 'operators',
  'task_reports', 'task_validations',
]
const VIVOS_ESPANOL = [
  'recetas', 'mayorista_pedidos', 'proveedor_productos', 'inventario_movimientos',
  'solicitudes_compra', 'mkt_campanas', 'operarios', 'op_tareas', 'products',
]

async function contar(db: ReturnType<typeof createServerClient>, tabla: string) {
  const { count, error } = await db.from(tabla).select('*', { count: 'exact', head: true })
  if (error) return { tabla, existe: false, filas: null as number | null, nota: error.message.slice(0, 80) }
  return { tabla, existe: true, filas: count ?? 0, nota: null as string | null }
}

export async function GET() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()
  const { data: me } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!ADMIN_ROLES.includes(String(me?.role || ''))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const ingles = []
  for (const t of SOSPECHOSAS_INGLES) ingles.push(await contar(db, t))
  const espanol = []
  for (const t of VIVOS_ESPANOL) espanol.push(await contar(db, t))

  const vaciasOInexistentes = ingles.filter(r => !r.existe || r.filas === 0).map(r => r.tabla)
  const conDatos = ingles.filter(r => r.existe && (r.filas ?? 0) > 0)

  return NextResponse.json({
    resumen: {
      candidatas_a_limpiar_vacias_o_inexistentes: vaciasOInexistentes.length,
      candidatas_con_datos_ojo: conDatos.map(r => `${r.tabla} (${r.filas})`),
    },
    ingles: ingles.sort((a, b) => (b.filas ?? -1) - (a.filas ?? -1)),
    espanol_vivos: espanol,
  })
}
