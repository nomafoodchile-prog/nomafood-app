// Cerebro compartido de "Carga rápida" (pegar planilla → crear registros).
// Lo usan tanto la Central (admin) como el Portal Operario (trabajadores autorizados).
// Tres cargas: Insumos/Productos, Inventario inicial (lotes) y Recetas (+ ingredientes).
import { createServerClient } from '@/lib/supabase/server'
import { normalizarCategoria } from '@/lib/categorias'

type DB = ReturnType<typeof createServerClient>
export type Auth = { id: string; email: string | null }

export type Resultado = { fila: number; nombre: string; estado: 'creado' | 'duplicado' | 'error'; detalle?: string }
export type CargaResp = { ok: true; creados: number; duplicados: number; errores: number; resultados: Resultado[] }

// ---------- helpers ----------
const clean = (v: unknown, n = 160) => v === null || v === undefined ? '' : String(v).trim().slice(0, n)
const norm = (v: unknown) => clean(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')
function numOrNull(v: unknown): number | null {
  const s = clean(v).replace(/\$/g, '').replace(/\./g, '').replace(',', '.').replace(/\s/g, '')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
function esSi(v: unknown): boolean { return ['si', 's', 'yes', 'y', 'true', '1', 'x'].includes(norm(v)) }
// Fecha: acepta dd-mm-aaaa, dd/mm/aaaa o aaaa-mm-dd → ISO aaaa-mm-dd (o null)
function fechaONull(v: unknown): string | null {
  const s = clean(v)
  if (!s) return null
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (m) { const a = m[3].length === 2 ? '20' + m[3] : m[3]; return `${a}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` }
  return null
}
const resumen = (resultados: Resultado[]): CargaResp => ({
  ok: true,
  creados: resultados.filter(r => r.estado === 'creado').length,
  duplicados: resultados.filter(r => r.estado === 'duplicado').length,
  errores: resultados.filter(r => r.estado === 'error').length,
  resultados,
})

// ====================================================================
// 1) INSUMOS / PRODUCTOS
// ====================================================================
const TIPOS = ['materia_prima', 'envase_insumo', 'reventa', 'preelaboracion'] as const
const TIPO_ALIAS: Record<string, string> = {
  'materia prima': 'materia_prima', 'materiaprima': 'materia_prima', 'mp': 'materia_prima',
  'ingrediente': 'materia_prima', 'insumo': 'materia_prima',
  'envase': 'envase_insumo', 'envase/insumo': 'envase_insumo', 'envase insumo': 'envase_insumo',
  'empaque': 'envase_insumo', 'material': 'envase_insumo', 'paqueteria': 'envase_insumo',
  'reventa': 'reventa', 'compra-venta': 'reventa', 'comprado': 'reventa',
  'preelaboracion': 'preelaboracion', 'pre': 'preelaboracion',
}
const UNIDADES = ['unidad', 'kilo', 'litro', 'bandeja', 'caja', 'bolsa', 'pack', 'docena']
const UNIDAD_ALIAS: Record<string, string> = {
  'un': 'unidad', 'u': 'unidad', 'unid': 'unidad', 'c/u': 'unidad', 'pza': 'unidad', 'pieza': 'unidad',
  'kg': 'kilo', 'kilogramo': 'kilo', 'kilos': 'kilo', 'k': 'kilo',
  'g': 'kilo', 'gr': 'kilo', 'gramo': 'kilo', 'gramos': 'kilo',
  'l': 'litro', 'lt': 'litro', 'litros': 'litro', 'lts': 'litro', 'ml': 'litro', 'cc': 'litro',
  'cajas': 'caja', 'bolsas': 'bolsa', 'packs': 'pack',
}

export type FilaInsumo = { nombre?: unknown; tipo?: unknown; unidad?: unknown; categoria?: unknown; costo?: unknown; stock_min?: unknown; stock_max?: unknown; vence?: unknown; marca?: unknown; unidades_por_caja?: unknown }

// Si no indican tipo, se deduce de la categoría (Paquetería = envase; el resto = materia prima).
function tipoDesdeCategoria(cat: string): string {
  return norm(cat) === norm('Paquetería') ? 'envase_insumo' : 'materia_prima'
}

export async function cargarInsumos(db: DB, filas: FilaInsumo[]): Promise<CargaResp> {
  const { data: existentes } = await db.from('products').select('nombre')
  const yaExiste = new Set((existentes || []).map(r => norm((r as { nombre: unknown }).nombre)))
  const resultados: Resultado[] = []
  const vistos = new Set<string>()

  for (let i = 0; i < filas.length; i++) {
    const f = filas[i]; const nfila = i + 1
    const nombre = clean(f.nombre, 160)
    if (!nombre) { resultados.push({ fila: nfila, nombre: '', estado: 'error', detalle: 'Falta el nombre' }); continue }
    const key = norm(nombre)
    if (yaExiste.has(key) || vistos.has(key)) { resultados.push({ fila: nfila, nombre, estado: 'duplicado', detalle: 'Ya existe un insumo con ese nombre' }); continue }

    const categoria = normalizarCategoria(clean(f.categoria, 120))
    const tipoRaw = norm(f.tipo)
    const tipo = (TIPOS as readonly string[]).includes(tipoRaw) ? tipoRaw : (TIPO_ALIAS[tipoRaw] || tipoDesdeCategoria(categoria))
    const uRaw = norm(f.unidad)
    const unidad = UNIDADES.includes(uRaw) ? uRaw : (UNIDAD_ALIAS[uRaw] || 'unidad')
    const costo = numOrNull(f.costo) ?? 0
    const vence = f.vence === undefined || clean(f.vence) === '' ? tipo === 'materia_prima' : esSi(f.vence)
    const sku = `${tipo === 'envase_insumo' ? 'ENV' : tipo === 'reventa' ? 'REV' : 'INS'}-${Date.now().toString(36).toUpperCase()}${i.toString(36).toUpperCase()}`

    const { error } = await db.from('products').insert({
      nombre, sku, tipo_producto: tipo, categoria: categoria || null,
      marca: clean(f.marca, 120) || null, cantidad_por_unidad_venta: numOrNull(f.unidades_por_caja),
      unidad_inventario: unidad, unidad, unidad_venta: null, estado_ciclo: 'borrador', visible_catalogo: false,
      precio: costo, stock_actual: 0, stock_min: numOrNull(f.stock_min), stock_max: numOrNull(f.stock_max),
      maneja_vencimiento: vence, maneja_lote: vence, activo: true,
    }).select('id').single()

    if (error) resultados.push({ fila: nfila, nombre, estado: 'error', detalle: error.message })
    else { vistos.add(key); resultados.push({ fila: nfila, nombre, estado: 'creado' }) }
  }
  return resumen(resultados)
}

// ====================================================================
// Mapa de productos por nombre (para inventario y recetas)
// ====================================================================
type Prod = { id: string; nombre: string; unidad_inventario: string | null; tipo_producto: string | null }
async function mapaProductos(db: DB): Promise<Map<string, Prod>> {
  const { data } = await db.from('products').select('id, nombre, unidad_inventario, tipo_producto').eq('activo', true)
  const m = new Map<string, Prod>()
  for (const p of (data as Prod[] | null) || []) { const k = norm(p.nombre); if (!m.has(k)) m.set(k, p) }
  return m
}

// ====================================================================
// 2) INVENTARIO INICIAL (crea un lote por línea, igual que "Alta de lote")
// ====================================================================
export type FilaInventario = { producto?: unknown; cantidad?: unknown; unidad?: unknown; vencimiento?: unknown; lote?: unknown }

export async function cargarInventario(db: DB, auth: Auth, lineas: FilaInventario[]): Promise<CargaResp> {
  const prods = await mapaProductos(db)
  const resultados: Resultado[] = []
  for (let i = 0; i < lineas.length; i++) {
    const f = lineas[i]; const nfila = i + 1
    const nombre = clean(f.producto, 160)
    if (!nombre) { resultados.push({ fila: nfila, nombre: '', estado: 'error', detalle: 'Falta el producto' }); continue }
    const p = prods.get(norm(nombre))
    if (!p) { resultados.push({ fila: nfila, nombre, estado: 'error', detalle: 'No existe ese producto. Cárgalo primero en Insumos.' }); continue }
    const cant = numOrNull(f.cantidad)
    if (cant === null || cant < 0) { resultados.push({ fila: nfila, nombre, estado: 'error', detalle: 'Cantidad inválida' }); continue }
    const unidad = clean(f.unidad) ? (UNIDAD_ALIAS[norm(f.unidad)] || clean(f.unidad)) : (p.unidad_inventario || 'unidad')

    const { error } = await db.from('inventario_lotes').insert({
      product_id: p.id, lote_codigo: clean(f.lote, 60) || null, es_externo: false,
      fecha_vencimiento: fechaONull(f.vencimiento), bodega_id: null, unidad,
      stock_inicial: cant, stock_disponible: cant, estado: cant > 0 ? 'disponible' : 'agotado', usuario_id: auth.id,
    }).select('id').single()
    if (error) { resultados.push({ fila: nfila, nombre, estado: 'error', detalle: error.message }); continue }
    resultados.push({ fila: nfila, nombre, estado: 'creado' })
  }
  return resumen(resultados)
}

// ====================================================================
// 3) RECETAS (agrupa por "Receta"; crea receta + versión 1 borrador + ingredientes)
//    No sobreescribe recetas que ya existen (las marca como duplicado).
// ====================================================================
export type FilaReceta = { receta?: unknown; ingrediente?: unknown; cantidad?: unknown; unidad?: unknown; merma?: unknown }

function tipoComponente(tipoProd: string | null): string {
  if (tipoProd === 'envase_insumo') return 'envase'
  if (tipoProd === 'preelaboracion') return 'preelaboracion'
  return 'materia_prima'
}

export async function cargarRecetas(db: DB, auth: Auth, lineas: FilaReceta[]): Promise<CargaResp> {
  const prods = await mapaProductos(db)
  // Agrupar líneas por nombre de receta (= producto terminado), conservando el número de fila original.
  const grupos = new Map<string, { receta: string; items: { fila: number; ingrediente: string; cantidad: unknown; unidad: unknown; merma: unknown }[] }>()
  lineas.forEach((f, i) => {
    const receta = clean(f.receta, 160)
    const ingrediente = clean(f.ingrediente, 160)
    if (!receta || !ingrediente) return
    const k = norm(receta)
    if (!grupos.has(k)) grupos.set(k, { receta, items: [] })
    grupos.get(k)!.items.push({ fila: i + 1, ingrediente, cantidad: f.cantidad, unidad: f.unidad, merma: f.merma })
  })

  const resultados: Resultado[] = []
  // Recetas ya existentes (por nombre) para no duplicar
  const { data: recExist } = await db.from('recetas').select('nombre')
  const recetasExistentes = new Set((recExist || []).map(r => norm((r as { nombre: unknown }).nombre)))

  for (const g of grupos.values()) {
    const prodTerminado = prods.get(norm(g.receta))
    const filaRef = g.items[0]?.fila ?? 0
    if (recetasExistentes.has(norm(g.receta))) { resultados.push({ fila: filaRef, nombre: g.receta, estado: 'duplicado', detalle: 'Ya existe una receta con ese nombre' }); continue }

    // Resolver ingredientes
    const rows: { producto_id: string; tipo_componente: string; cantidad: number; unidad: string | null; merma_pct: number; obligatorio: boolean; orden: number }[] = []
    const faltantes: Resultado[] = []
    g.items.forEach((it, idx) => {
      const ip = prods.get(norm(it.ingrediente))
      if (!ip) { faltantes.push({ fila: it.fila, nombre: it.ingrediente, estado: 'error', detalle: `Ingrediente no existe (receta "${g.receta}"). Cárgalo en Insumos.` }); return }
      rows.push({ producto_id: ip.id, tipo_componente: tipoComponente(ip.tipo_producto), cantidad: numOrNull(it.cantidad) ?? 0, unidad: clean(it.unidad) ? (UNIDAD_ALIAS[norm(it.unidad)] || clean(it.unidad)) : (ip.unidad_inventario || null), merma_pct: numOrNull(it.merma) ?? 0, obligatorio: true, orden: idx })
    })

    if (rows.length === 0) { resultados.push({ fila: filaRef, nombre: g.receta, estado: 'error', detalle: 'Ningún ingrediente válido' }); resultados.push(...faltantes); continue }

    // Crear receta (product_id si el terminado existe) + versión 1 borrador
    const { data: rec, error: e1 } = await db.from('recetas').insert({
      nombre: g.receta, product_id: prodTerminado?.id ?? null, tipo_receta: 'producto_terminado', created_by: auth.id,
    }).select('id').single()
    if (e1 || !rec) { resultados.push({ fila: filaRef, nombre: g.receta, estado: 'error', detalle: e1?.message || 'No se pudo crear la receta' }); continue }
    const { data: ver, error: e2 } = await db.from('receta_versiones').insert({ receta_id: rec.id, version: 1, estado: 'borrador', created_by: auth.id }).select('id').single()
    if (e2 || !ver) { resultados.push({ fila: filaRef, nombre: g.receta, estado: 'error', detalle: e2?.message || 'No se pudo crear la versión' }); continue }

    const { error: e3 } = await db.from('receta_ingredientes').insert(rows.map(r => ({ ...r, version_id: ver.id })))
    if (e3) { resultados.push({ fila: filaRef, nombre: g.receta, estado: 'error', detalle: e3.message }); continue }

    recetasExistentes.add(norm(g.receta))
    const faltaMsg = faltantes.length ? ` (faltaron ${faltantes.length} ingrediente(s))` : ''
    resultados.push({ fila: filaRef, nombre: g.receta, estado: 'creado', detalle: `${rows.length} ingrediente(s)${faltaMsg} · queda en borrador para revisar` })
    resultados.push(...faltantes)
  }

  if (grupos.size === 0) resultados.push({ fila: 1, nombre: '', estado: 'error', detalle: 'No se detectaron recetas. Revisa el formato (Receta + Ingrediente por fila).' })
  return resumen(resultados)
}
