// lib/agente/senales.ts
// "Detector de señales" del orquestador: lee datos REALES (solo lectura) y
// devuelve incidencias (quiebres de stock, stock bajo, vencimientos, calidad).
// Reutiliza la lógica probada del endpoint /api/central/alertas, centralizada
// aquí para que la pueda llamar también el cron (sin sesión de usuario).
//
// DISEÑO MULTI-EMPRESA (venta futura): esta función recibe el cliente `db` y
// no asume un solo dueño; el día que haya tenant_id, se filtra aquí en un punto.
// Hoy, un solo tenant: devuelve las señales de la operación actual.

import type { SupabaseClient } from '@supabase/supabase-js'

type Row = Record<string, unknown>
const N = (v: unknown) => { const n = Number(v); return Number.isNaN(n) ? 0 : n }

export interface Senal {
  tipo: string
  prioridad: 'critica' | 'alta' | 'media' | 'baja'
  area: string
  titulo: string
  mensaje: string
  accion_sugerida: string
  clave: string        // identificador estable para deduplicar
  suena: boolean
  ref_tipo: string
  ref_id: string
  estado: 'nueva'
}

// Genera las señales de inventario/calidad a partir del stock neto real.
export async function generarSenales(db: SupabaseClient): Promise<Senal[]> {
  const senales: Senal[] = []

  const { data: prods } = await db
    .from('products')
    .select('id, nombre, stock_min')
    .not('stock_min', 'is', null)

  const { data: lotes } = await db
    .from('inventario_lotes')
    .select('id, product_id, stock_disponible, stock_reservado, stock_retenido, stock_bloqueado, estado, fecha_vencimiento, lote_codigo, producto:products(nombre)')

  // Stock neto por producto
  const netoByProd = new Map<string, number>()
  for (const l of (lotes as Row[] | null) || []) {
    const pid = String(l.product_id)
    const neto = N(l.stock_disponible) - N(l.stock_reservado) - N(l.stock_retenido) - N(l.stock_bloqueado)
    netoByProd.set(pid, (netoByProd.get(pid) ?? 0) + neto)
  }

  // Quiebre / stock bajo
  for (const p of (prods as Row[] | null) || []) {
    const pid = String(p.id)
    const neto = netoByProd.get(pid) ?? 0
    const min = N(p.stock_min)
    if (neto <= 0) {
      senales.push({
        tipo: 'quiebre_stock', prioridad: 'critica', area: 'Compras',
        titulo: `Quiebre de stock: ${String(p.nombre)}`,
        mensaje: `Stock neto ${neto}. Sin disponibilidad.`,
        accion_sugerida: 'Generar solicitud de compra',
        clave: `stock:${pid}`, suena: true, ref_tipo: 'producto', ref_id: pid, estado: 'nueva',
      })
    } else if (neto < min) {
      senales.push({
        tipo: 'stock_bajo', prioridad: 'alta', area: 'Compras',
        titulo: `Stock bajo: ${String(p.nombre)}`,
        mensaje: `Neto ${neto} < mínimo ${min}.`,
        accion_sugerida: 'Revisar reposición',
        clave: `stock:${pid}`, suena: true, ref_tipo: 'producto', ref_id: pid, estado: 'nueva',
      })
    }
  }

  // Vencimientos (FEFO) y calidad
  const hoy = Date.now(); const en7 = hoy + 7 * 86400000
  for (const l of (lotes as Row[] | null) || []) {
    const nom = String((l.producto as Row)?.nombre || '')
    const lote = String(l.lote_codigo || '')
    if (l.fecha_vencimiento && new Date(String(l.fecha_vencimiento)).getTime() <= en7 && !['agotado', 'vencido'].includes(String(l.estado))) {
      senales.push({
        tipo: 'por_vencer', prioridad: 'media', area: 'Producción',
        titulo: `Por vencer: ${nom}`,
        mensaje: `Lote ${lote} próximo a vencer (FEFO).`,
        accion_sugerida: 'Priorizar consumo/despacho',
        clave: `vencer:${String(l.id)}`, suena: false, ref_tipo: 'lote', ref_id: String(l.id), estado: 'nueva',
      })
    }
    if (String(l.estado) === 'bloqueado') {
      senales.push({
        tipo: 'lote_bloqueado', prioridad: 'alta', area: 'Calidad',
        titulo: `Lote bloqueado: ${nom}`,
        mensaje: `Lote ${lote} bloqueado.`,
        accion_sugerida: 'Revisar calidad',
        clave: `bloq:${String(l.id)}`, suena: true, ref_tipo: 'lote', ref_id: String(l.id), estado: 'nueva',
      })
    } else if (String(l.estado) === 'retenido') {
      senales.push({
        tipo: 'lote_retenido', prioridad: 'media', area: 'Calidad',
        titulo: `Lote retenido: ${nom}`,
        mensaje: `Lote ${lote} retenido.`,
        accion_sugerida: 'Resolver retención',
        clave: `reten:${String(l.id)}`, suena: false, ref_tipo: 'lote', ref_id: String(l.id), estado: 'nueva',
      })
    }
  }

  return senales
}

// Persiste señales nuevas en `notificaciones`, deduplicando por `clave`
// (no re-crea una incidencia que ya está abierta). Devuelve cuántas se crearon.
export async function persistirSenales(db: SupabaseClient, senales: Senal[]): Promise<number> {
  if (!senales.length) return 0
  const claves = senales.map(s => s.clave)
  const { data: existing } = await db
    .from('notificaciones').select('clave').in('clave', claves).neq('estado', 'resuelta')
  const have = new Set(((existing as Row[] | null) || []).map(e => String(e.clave)))
  const toInsert = senales.filter(s => !have.has(s.clave))
  if (toInsert.length) await db.from('notificaciones').insert(toInsert)
  return toInsert.length
}
