import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const revalidate = 60

// Catálogo público para la landing: solo productos visibles y campos públicos.
export async function GET() {
  const db = createServerClient()
  const { data } = await db.from('products')
    .select('id, nombre, categoria, subcategoria, descripcion_publica, foto_oficial_url, precio_venta, unidad_venta')
    .eq('visible_catalogo', true)
    .order('categoria', { ascending: true })
    .order('nombre', { ascending: true })
  return NextResponse.json({ ok: true, productos: data || [] })
}
