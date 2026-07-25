import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const revalidate = 60

// Catálogo público para la landing: solo productos visibles y campos públicos.
export async function GET() {
  const db = createServerClient()
  const { data } = await db.from('products')
    .select('id, nombre, categoria, subcategoria, descripcion, descripcion_publica, foto_oficial_url, precio, precio_venta, unidad_venta')
    .eq('visible_catalogo', true)
    .order('categoria', { ascending: true })
    .order('nombre', { ascending: true })

  // Normaliza campos: usa los de marketing si existen, si no los del formulario.
  type P = Record<string, unknown>
  const productos = ((data as P[]) || []).map(p => ({
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    subcategoria: p.subcategoria,
    descripcion_publica: p.descripcion_publica || p.descripcion || null,
    foto_oficial_url: p.foto_oficial_url || null,
    precio_venta: p.precio_venta ?? p.precio ?? null,
    unidad_venta: p.unidad_venta || null,
  }))
  return NextResponse.json({ ok: true, productos })
}
