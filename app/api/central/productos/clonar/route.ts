import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']

// POST /api/central/productos/clonar
// { source_nombre | source_id, nombre, descripcion? }
// Copia la ficha COMPLETA de un producto existente y crea uno nuevo con otro
// nombre/descripción. No copia la foto (cada sabor lleva la suya) ni el stock.
export async function POST(req: NextRequest) {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()
  const { data: me } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!CENTRAL_ROLES.includes(String(me?.role || ''))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const nombre = String(b.nombre || '').trim()
  if (!nombre) return NextResponse.json({ error: 'Falta el nombre del nuevo producto.' }, { status: 400 })

  // 1) Buscar el producto de origen
  let q = db.from('products').select('*')
  if (b.source_id) q = q.eq('id', String(b.source_id))
  else if (b.source_nombre) q = q.eq('nombre', String(b.source_nombre))
  else return NextResponse.json({ error: 'Falta el producto de origen.' }, { status: 400 })
  const { data: src, error: eSrc } = await q.limit(1).maybeSingle()
  if (eSrc || !src) return NextResponse.json({ error: 'No se encontró el producto de origen.' }, { status: 404 })

  // Si ya existe uno con ese nombre, solo actualiza sus descripciones (idempotente).
  const { data: ya } = await db.from('products').select('id').eq('nombre', nombre).maybeSingle()
  if (ya?.id) {
    if (b.descripcion !== undefined) {
      await db.from('products').update({ descripcion: String(b.descripcion), descripcion_publica: String(b.descripcion) }).eq('id', ya.id)
    }
    return NextResponse.json({ ok: true, ya: true, id: ya.id })
  }

  // 2) Copiar toda la ficha, cambiando lo justo
  const nuevo: Record<string, unknown> = { ...(src as Record<string, unknown>) }
  delete nuevo.id
  delete nuevo.created_at
  delete nuevo.updated_at
  nuevo.nombre = nombre
  if (b.descripcion !== undefined) { nuevo.descripcion = String(b.descripcion); nuevo.descripcion_publica = String(b.descripcion) }
  nuevo.sku = 'NF-' + Math.random().toString(16).slice(2, 10).toUpperCase() // SKU único autogenerado (la BD lo exige)
  nuevo.foto_oficial_url = null     // cada sabor sube su propia foto
  if ('foto_empaque_url' in nuevo) nuevo.foto_empaque_url = null
  nuevo.stock_actual = 0

  const { data: creado, error: eIns } = await db.from('products').insert(nuevo).select('id').single()
  if (eIns || !creado) return NextResponse.json({ error: 'No se pudo crear: ' + (eIns?.message || '') }, { status: 500 })

  // Historial de precio para el nuevo producto
  if (nuevo.precio != null) {
    await db.from('product_price_history').insert({ product_id: creado.id, precio_neto: Number(nuevo.precio), usuario_id: user.id, usuario_email: user.email ?? null }).then(() => {}, () => {})
  }

  return NextResponse.json({ ok: true, id: creado.id, nombre })
}
