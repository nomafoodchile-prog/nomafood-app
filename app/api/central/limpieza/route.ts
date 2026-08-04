import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { proximaDe, estadoDe } from '@/lib/ops/recurrencia'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']

async function auth(): Promise<{ email: string | null } | null> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return null
  const { data: p } = await createServerClient().from('profiles').select('role, full_name').eq('id', user.id).maybeSingle()
  if (!CENTRAL_ROLES.includes(String(p?.role || ''))) return null
  return { email: (p as any)?.full_name || user.email || null }
}

// GET → áreas con sus tareas (+ última ejecución de cada tarea)
export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()

  const { data: areas } = await db.from('ops_areas').select('id, nombre, orden').eq('activo', true).order('orden').order('nombre')
  const { data: tareas } = await db.from('ops_limpieza_tareas')
    .select('id, area_id, nombre, pasos, tiempo_estimado_min, recurrencia, dia_semana, orden')
    .eq('activo', true).order('orden')

  // Última ejecución por tarea
  const { data: ejec } = await db.from('ops_ejecuciones')
    .select('tarea_limpieza_id, fecha_realizada, realizado_por, tiempo_real_min')
    .eq('tipo', 'limpieza').order('fecha_realizada', { ascending: false })
  const ultimaMap = new Map<string, any>()
  for (const e of ejec || []) {
    if (e.tarea_limpieza_id && !ultimaMap.has(e.tarea_limpieza_id)) ultimaMap.set(e.tarea_limpieza_id, e)
  }

  const result = (areas || []).map(a => ({
    ...a,
    tareas: (tareas || []).filter(t => t.area_id === a.id).map(t => {
      const ultima = ultimaMap.get(t.id) || null
      const proxima = proximaDe(ultima?.fecha_realizada, t.recurrencia)
      return {
        ...t,
        pasos: Array.isArray(t.pasos) ? t.pasos : [],
        ultima,
        proxima,
        estado: estadoDe(proxima),
      }
    }),
  }))

  return NextResponse.json({ areas: result })
}

// POST → acciones: crear área, crear tarea, marcar hecha
export async function POST(req: NextRequest) {
  const a = await auth()
  if (!a) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const body = await req.json()

  if (body.action === 'area') {
    const nombre = String(body.nombre || '').trim()
    if (!nombre) return NextResponse.json({ error: 'Falta el nombre del área' }, { status: 400 })
    const { error } = await db.from('ops_areas').insert({ nombre })
    if (error) return NextResponse.json({ error: 'No se pudo crear el área' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'tarea') {
    const nombre = String(body.nombre || '').trim()
    if (!body.area_id || !nombre) return NextResponse.json({ error: 'Falta área o nombre' }, { status: 400 })
    const pasos = Array.isArray(body.pasos) ? body.pasos.map((p: any) => String(p)).filter(Boolean) : []
    const { error } = await db.from('ops_limpieza_tareas').insert({
      area_id: body.area_id,
      nombre,
      pasos,
      tiempo_estimado_min: body.tiempo_estimado_min ? Number(body.tiempo_estimado_min) : null,
      recurrencia: body.recurrencia || 'diaria',
      dia_semana: body.dia_semana ? Number(body.dia_semana) : null,
    })
    if (error) return NextResponse.json({ error: 'No se pudo crear la tarea' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'ejecutar') {
    if (!body.tarea_id) return NextResponse.json({ error: 'Falta la tarea' }, { status: 400 })
    const { error } = await db.from('ops_ejecuciones').insert({
      tipo: 'limpieza',
      tarea_limpieza_id: body.tarea_id,
      realizado_por: a.email,
      tiempo_real_min: body.tiempo_real_min ? Number(body.tiempo_real_min) : null,
      a_tiempo: true,
    })
    if (error) return NextResponse.json({ error: 'No se pudo registrar' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
