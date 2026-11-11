import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { esAutorizado } from '@/lib/central/carga-permiso'
import { cargarInsumos, cargarInventario, cargarRecetas, type FilaInsumo, type FilaInventario, type FilaReceta } from '@/lib/central/carga'
import { CATEGORIAS_INSUMO } from '@/lib/categorias'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UNIDADES = ['unidad', 'kilo', 'litro', 'caja', 'bolsa', 'pack', 'bandeja', 'docena']

async function usuario() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  return user ? { id: user.id, email: user.email ?? null } : null
}

// GET → datos para el formulario (categorías, unidades, productos existentes para sugerencias)
export async function GET() {
  const u = await usuario()
  if (!u) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServerClient()
  const autorizado = await esAutorizado(db, u.id)
  if (!autorizado) return NextResponse.json({ autorizado: false, categorias: [], unidades: UNIDADES, existentes: [] })
  const { data } = await db.from('products').select('nombre, categoria, marca').eq('activo', true).order('nombre')
  return NextResponse.json({
    autorizado: true,
    categorias: CATEGORIAS_INSUMO,
    unidades: UNIDADES,
    existentes: (data || []).map(p => ({ nombre: String(p.nombre || ''), categoria: String(p.categoria || ''), marca: String(p.marca || '') })),
  })
}

// POST → guarda lo cargado (insumos / inventario / recetas)
export async function POST(req: NextRequest) {
  const u = await usuario()
  if (!u) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServerClient()
  if (!(await esAutorizado(db, u.id))) return NextResponse.json({ error: 'No tienes permiso para cargar datos. Pídele a tu jefatura que te active la carga.' }, { status: 403 })

  let body: Record<string, unknown> = {}
  try { body = await req.json() as Record<string, unknown> } catch { /* sin body */ }
  const tipo = String(body.tipo || 'insumos')
  const filas = Array.isArray(body.filas) ? body.filas : []
  if (filas.length === 0) return NextResponse.json({ error: 'No hay nada para guardar.' }, { status: 400 })
  if (filas.length > 500) return NextResponse.json({ error: 'Máximo 500 por carga. Divide la lista.' }, { status: 400 })

  try {
    if (tipo === 'inventario') return NextResponse.json(await cargarInventario(db, u, filas as FilaInventario[]))
    if (tipo === 'recetas') return NextResponse.json(await cargarRecetas(db, u, filas as FilaReceta[]))
    return NextResponse.json(await cargarInsumos(db, filas as FilaInsumo[]))
  } catch (e) {
    return NextResponse.json({ error: 'No se pudo guardar. ' + (e instanceof Error ? e.message : '') }, { status: 500 })
  }
}
