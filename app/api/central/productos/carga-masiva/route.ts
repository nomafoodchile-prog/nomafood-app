import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { normalizarCategoria } from '@/lib/categorias'

export const runtime = 'nodejs'

// Carga masiva de INSUMOS (materia prima / envases / reventa) desde una planilla.
// El equipo pega filas; aquí se validan e insertan de una. No vendible → no
// visible en catálogo (respeta chk_visible_solo_vendibles). estado_ciclo
// 'borrador' para no gatillar constraints de ciclo.
const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']

// Tipos de insumo válidos + sinónimos amables que puede escribir el equipo.
const TIPOS = ['materia_prima', 'envase_insumo', 'reventa', 'preelaboracion'] as const
const TIPO_ALIAS: Record<string, string> = {
  'materia prima': 'materia_prima', 'materiaprima': 'materia_prima', 'mp': 'materia_prima',
  'ingrediente': 'materia_prima', 'insumo': 'materia_prima',
  'envase': 'envase_insumo', 'envase/insumo': 'envase_insumo', 'envase insumo': 'envase_insumo',
  'empaque': 'envase_insumo', 'material': 'envase_insumo',
  'reventa': 'reventa', 'compra-venta': 'reventa', 'comprado': 'reventa',
  'preelaboracion': 'preelaboracion', 'preelaboración': 'preelaboracion', 'pre': 'preelaboracion',
}
// Unidades de inventario válidas + sinónimos.
const UNIDADES = ['unidad', 'kilo', 'litro', 'bandeja', 'caja', 'bolsa', 'pack', 'docena']
const UNIDAD_ALIAS: Record<string, string> = {
  'un': 'unidad', 'u': 'unidad', 'unid': 'unidad', 'c/u': 'unidad', 'pza': 'unidad', 'pieza': 'unidad',
  'kg': 'kilo', 'kilogramo': 'kilo', 'kilos': 'kilo', 'k': 'kilo',
  'g': 'kilo', 'gr': 'kilo', 'gramo': 'kilo', 'gramos': 'kilo', // se maneja en kilo; el equipo convierte
  'l': 'litro', 'lt': 'litro', 'litros': 'litro', 'lts': 'litro',
  'ml': 'litro', 'cc': 'litro',
  'caja': 'caja', 'cajas': 'caja', 'bolsa': 'bolsa', 'bolsas': 'bolsa',
  'pack': 'pack', 'packs': 'pack', 'bandeja': 'bandeja', 'docena': 'docena',
}

const clean = (v: unknown, n = 160) =>
  v === null || v === undefined ? '' : String(v).trim().slice(0, n)
const norm = (v: unknown) => clean(v).toLowerCase().replace(/\s+/g, ' ')

function numOrNull(v: unknown): number | null {
  const s = clean(v).replace(/\$/g, '').replace(/\./g, '').replace(',', '.').replace(/\s/g, '')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
function esSi(v: unknown): boolean {
  const s = norm(v)
  return ['si', 'sí', 's', 'yes', 'y', 'true', '1', 'x'].includes(s)
}

async function getAuth(): Promise<{ id: string; email: string | null; role: string } | null> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return null
  const { data: profile } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = (profile?.role as string | undefined) || ''
  if (!CENTRAL_ROLES.includes(role)) return null
  return { id: user.id, email: user.email ?? null, role }
}

type FilaIn = {
  nombre?: unknown; tipo?: unknown; unidad?: unknown; categoria?: unknown
  costo?: unknown; stock_min?: unknown; stock_max?: unknown; vence?: unknown
}
type Resultado = { fila: number; nombre: string; estado: 'creado' | 'duplicado' | 'error'; detalle?: string }

export async function POST(req: NextRequest) {
  const auth = await getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado. Pide acceso de producción o administración.' }, { status: 403 })

  let body: { filas?: FilaIn[] } = {}
  try { body = await req.json() } catch { /* sin body */ }
  const filas = Array.isArray(body.filas) ? body.filas : []
  if (filas.length === 0) return NextResponse.json({ error: 'No hay filas para cargar.' }, { status: 400 })
  if (filas.length > 500) return NextResponse.json({ error: 'Máximo 500 filas por carga. Divide la lista.' }, { status: 400 })

  const db = createServerClient()

  // Nombres ya existentes (para no duplicar). Comparación insensible a mayúsculas.
  const { data: existentes } = await db.from('products').select('nombre')
  const yaExiste = new Set((existentes || []).map(r => norm((r as { nombre: unknown }).nombre)))

  const resultados: Resultado[] = []
  const vistos = new Set<string>()

  for (let i = 0; i < filas.length; i++) {
    const f = filas[i]
    const nfila = i + 1
    const nombre = clean(f.nombre, 160)
    if (!nombre) { resultados.push({ fila: nfila, nombre: '', estado: 'error', detalle: 'Falta el nombre' }); continue }

    const key = norm(nombre)
    if (yaExiste.has(key) || vistos.has(key)) {
      resultados.push({ fila: nfila, nombre, estado: 'duplicado', detalle: 'Ya existe un insumo con ese nombre' })
      continue
    }

    const tipoRaw = norm(f.tipo)
    const tipo = (TIPOS as readonly string[]).includes(tipoRaw) ? tipoRaw : (TIPO_ALIAS[tipoRaw] || 'materia_prima')
    const uRaw = norm(f.unidad)
    const unidad = UNIDADES.includes(uRaw) ? uRaw : (UNIDAD_ALIAS[uRaw] || 'unidad')
    const costo = numOrNull(f.costo) ?? 0
    const stockMin = numOrNull(f.stock_min)
    const stockMax = numOrNull(f.stock_max)
    const vence = f.vence === undefined ? tipo === 'materia_prima' : esSi(f.vence)

    const sku = `${tipo === 'envase_insumo' ? 'ENV' : tipo === 'reventa' ? 'REV' : 'INS'}-${Date.now().toString(36).toUpperCase()}${i.toString(36).toUpperCase()}`

    const { error } = await db.from('products').insert({
      nombre,
      sku,
      tipo_producto: tipo,
      categoria: normalizarCategoria(clean(f.categoria, 120)) || null,
      unidad_inventario: unidad,
      unidad,                        // columna legacy sincronizada
      unidad_venta: null,            // insumo no vendible
      estado_ciclo: 'borrador',
      visible_catalogo: false,
      precio: costo,                 // costo de referencia del insumo
      stock_actual: 0,
      stock_min: stockMin,
      stock_max: stockMax,
      maneja_vencimiento: vence,
      maneja_lote: vence,
      activo: true,
    }).select('id').single()

    if (error) {
      resultados.push({ fila: nfila, nombre, estado: 'error', detalle: error.message })
    } else {
      vistos.add(key)
      resultados.push({ fila: nfila, nombre, estado: 'creado' })
    }
  }

  const creados = resultados.filter(r => r.estado === 'creado').length
  const duplicados = resultados.filter(r => r.estado === 'duplicado').length
  const errores = resultados.filter(r => r.estado === 'error').length
  return NextResponse.json({ ok: true, creados, duplicados, errores, resultados })
}
