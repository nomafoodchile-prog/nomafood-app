import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']

interface ProductoBody {
  action?: 'update' | 'create'
  id?: string
  nombre?: string
  sku?: string
  categoria?: string
  unidad?: string
  precio?: number | string
  activo?: boolean
}

// Verifica que quien llama sea un rol interno (no un cliente/chofer).
async function esAdmin(): Promise<boolean> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return false
  const { data: profile } = await createServerClient()
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = (profile?.role as string | undefined) || ''
  return CENTRAL_ROLES.includes(role)
}

// POST /api/central/productos — crear o actualizar un producto (solo admin).
// Los cambios se hacen con service role, previa validación de rol.
export async function POST(req: NextRequest) {
  if (!(await esAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: ProductoBody = {}
  try { body = await req.json() as ProductoBody } catch { /* sin body */ }

  const db = createServerClient()

  if (body.action === 'update') {
    if (!body.id) return NextResponse.json({ error: 'Falta el producto' }, { status: 400 })
    const patch: Record<string, unknown> = {}
    if (body.precio !== undefined && body.precio !== '') patch.precio = Number(body.precio)
    if (body.activo !== undefined) patch.activo = Boolean(body.activo)
    if (body.nombre !== undefined) patch.nombre = String(body.nombre).trim()
    if (body.categoria !== undefined) patch.categoria = String(body.categoria).trim()
    if (body.unidad !== undefined) patch.unidad = String(body.unidad).trim()
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })

    const { error } = await db.from('products').update(patch).eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'create') {
    const nombre = String(body.nombre || '').trim()
    if (!nombre || body.precio === undefined || body.precio === '') {
      return NextResponse.json({ error: 'El nombre y el precio son obligatorios' }, { status: 400 })
    }
    const { data, error } = await db.from('products').insert({
      nombre,
      sku:        body.sku ? String(body.sku).trim() : null,
      categoria:  body.categoria ? String(body.categoria).trim() : null,
      unidad:     body.unidad ? String(body.unidad).trim() : 'un',
      precio:     Number(body.precio),
      stock_actual: 0,
      activo:     true,
    }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: data.id })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
