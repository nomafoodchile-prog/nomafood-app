import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Devuelve las sucursales que este usuario puede ver (admin = todas de su org)
async function sucursalesPermitidas(db: ReturnType<typeof createServerClient>, userId: string): Promise<Set<string>> {
  const { data: vinculos } = await db.from('mayorista_usuarios')
    .select('organizacion_id, mayorista_id, rol').eq('profile_id', userId).eq('activo', true)
  if (!vinculos || vinculos.length === 0) return new Set()
  if (vinculos.some(v => v.rol === 'admin_general')) {
    const orgId = vinculos[0].organizacion_id
    const { data } = await db.from('mayoristas').select('id').eq('organizacion_id', orgId).eq('es_sucursal', true).eq('activo', true)
    return new Set((data || []).map(m => m.id))
  }
  return new Set(vinculos.map(v => v.mayorista_id).filter(Boolean) as string[])
}

function estado(actual: number, min: number, porRecibir: number): string {
  if (actual <= 0) return 'sin_stock'
  if (porRecibir > 0 && actual < min) return 'reposicion'
  if (actual < min * 0.34) return 'critico'
  if (actual < min) return 'bajo'
  return 'ok'
}
const ORDEN: Record<string, number> = { sin_stock: 0, critico: 1, bajo: 2, reposicion: 3, ok: 4 }

// GET /api/portal/aldea/stock?sucursal=<mayorista_id>
export async function GET(req: NextRequest) {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()

  const permitidas = await sucursalesPermitidas(db, user.id)
  if (permitidas.size === 0) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const sucursal = req.nextUrl.searchParams.get('sucursal') || [...permitidas][0]
  if (!permitidas.has(sucursal)) return NextResponse.json({ error: 'No puedes ver esta sucursal' }, { status: 403 })

  const { data: stock } = await db.from('aldea_stock')
    .select('product_id, stock_actual, stock_min, stock_ideal, por_recibir, updated_at')
    .eq('mayorista_id', sucursal)

  const ids = (stock || []).map(s => s.product_id)
  const prodMap = new Map<string, any>()
  if (ids.length) {
    const { data: prods } = await db.from('products')
      .select('id, nombre, sku, unidad, categoria, imagen_url').in('id', ids)
    for (const p of prods || []) prodMap.set(p.id, p)
  }

  const items = (stock || []).map(s => {
    const p = prodMap.get(s.product_id) || {}
    const est = estado(Number(s.stock_actual), Number(s.stock_min), Number(s.por_recibir))
    return {
      product_id: s.product_id,
      nombre: p.nombre || 'Producto',
      sku: p.sku || '',
      unidad: p.unidad || 'un',
      categoria: p.categoria || '',
      imagen_url: p.imagen_url || null,
      stock_actual: Number(s.stock_actual),
      stock_min: Number(s.stock_min),
      stock_ideal: Number(s.stock_ideal),
      por_recibir: Number(s.por_recibir),
      estado: est,
    }
  }).sort((a, b) => (ORDEN[a.estado] - ORDEN[b.estado]) || a.nombre.localeCompare(b.nombre))

  const resumen = {
    total: items.length,
    criticos: items.filter(i => ['critico', 'sin_stock'].includes(i.estado)).length,
    bajos: items.filter(i => i.estado === 'bajo').length,
  }

  return NextResponse.json({ items, resumen })
}
