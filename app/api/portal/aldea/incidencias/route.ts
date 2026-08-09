import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { contextoAldea } from '@/lib/aldea/permisos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/portal/aldea/incidencias?sucursal=  → lista incidencias/consultas de la sucursal
export async function GET(req: NextRequest) {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()
  const ctx = await contextoAldea(db, user.id)
  if (!ctx) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const sucursal = req.nextUrl.searchParams.get('sucursal') || [...ctx.sucursales][0]
  if (!sucursal || !ctx.sucursales.has(sucursal)) return NextResponse.json({ error: 'No puedes ver esta sucursal' }, { status: 403 })

  const { data } = await db.from('aldea_incidencias')
    .select('id, tipo, descripcion, estado, respuesta_central, solicitud_id, created_at')
    .eq('mayorista_id', sucursal).order('created_at', { ascending: false }).limit(100)

  return NextResponse.json({ incidencias: data || [] })
}

// POST /api/portal/aldea/incidencias  → el local reporta una incidencia o consulta
export async function POST(req: NextRequest) {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()
  const ctx = await contextoAldea(db, user.id)
  if (!ctx) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  const body = await req.json()
  const sucursal = String(body.sucursal || '')
  if (!ctx.sucursales.has(sucursal)) return NextResponse.json({ error: 'Sucursal no válida' }, { status: 403 })
  const descripcion = String(body.descripcion || '').trim()
  if (!descripcion) return NextResponse.json({ error: 'Escribe una descripción.' }, { status: 400 })

  const { error } = await db.from('aldea_incidencias').insert({
    mayorista_id: sucursal,
    organizacion_id: ctx.organizacion_id,
    solicitud_id: body.solicitud_id || null,
    tipo: body.tipo ? String(body.tipo) : 'otro',
    descripcion,
    estado: 'nueva',
    creada_por: user.id,
  })
  if (error) return NextResponse.json({ error: 'No se pudo registrar.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
