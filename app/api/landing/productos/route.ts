import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const revalidate = 60

// Catálogo público para la landing: solo productos visibles y campos públicos.
export async function GET() {
  const db = createServerClient()
  const BASE = 'id, nombre, categoria, subcategoria, descripcion, descripcion_publica, foto_oficial_url, precio, precio_venta, unidad_venta, tipo_producto'
  // Resiliente: intenta con la 2a foto (empaque); si la columna aun no existe, cae a la base.
  let q: any = await db.from('products').select(BASE + ', foto_empaque_url')
    .eq('visible_catalogo', true).order('categoria', { ascending: true }).order('nombre', { ascending: true })
  if (q.error) q = await db.from('products').select(BASE)
    .eq('visible_catalogo', true).order('categoria', { ascending: true }).order('nombre', { ascending: true })
  const data = q.data

  // Excluye tipos internos (insumos/materia prima) por si quedaran "visibles".
  const TIPOS_INTERNOS = ['materia_prima', 'envase_insumo', 'preelaboracion']

  // Normaliza campos: usa los de marketing si existen, si no los del formulario.
  type P = Record<string, unknown>
  const productos = ((data as P[]) || [])
    .filter(p => !TIPOS_INTERNOS.includes(String(p.tipo_producto)))
    .map(p => ({
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    subcategoria: p.subcategoria,
    descripcion_publica: p.descripcion_publica || p.descripcion || null,
    foto_oficial_url: p.foto_oficial_url || null,
    foto_empaque_url: p.foto_empaque_url || null,
    precio_venta: p.precio_venta ?? p.precio ?? null,
    unidad_venta: p.unidad_venta || null,
  }))
  return NextResponse.json({ ok: true, productos })
}
