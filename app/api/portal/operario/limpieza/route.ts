import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { proximaDe, estadoDe } from '@/app/api/central/limpieza/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cualquier usuario autenticado (operario) puede ver y marcar limpieza.
async function usuario(): Promise<{ id: string; nombre: string } | null> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return null
  const { data: p } = await createServerClient().from('profiles').select('full_name').eq('id', user.id).maybeSingle()
  return { id: user.id, nombre: (p as any)?.full_name || user.email || 'Operario' }
}

// GET → tareas de limpieza que tocan (hoy o atrasadas), con su área y pasos
export async function GET() {
  if (!await usuario()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()

  const { data: areas } = await db.from('ops_areas').select('id, nombre').eq('activo', true)
  const { data: tareas } = await db.from('ops_limpieza_tareas')
    .select('id, area_id, nombre, pasos, tiempo_estimado_min, recurrencia').eq('activo', true)
  const { data: ejec } = await db.from('ops_ejecuciones')
    .select('tarea_limpieza_id, fecha_realizada').eq('tipo', 'limpieza').order('fecha_realizada', { ascending: false })

  const ultimaMap = new Map<string, string>()
  for (const e of ejec || []) {
    if (e.tarea_limpieza_id && !ultimaMap.has(e.tarea_limpieza_id)) ultimaMap.set(e.tarea_limpieza_id, e.fecha_realizada)
  }
  const areaMap = new Map<string, string>((areas || []).map(a => [a.id, a.nombre]))

  const pendientes = (tareas || []).map(t => {
    const proxima = proximaDe(ultimaMap.get(t.id), t.recurrencia)
    return {
      id: t.id,
      nombre: t.nombre,
      area: areaMap.get(t.area_id) || '',
      pasos: Array.isArray(t.pasos) ? t.pasos : [],
      tiempo_estimado_min: t.tiempo_estimado_min,
      proxima,
      estado: estadoDe(proxima),
    }
  }).filter(t => t.estado !== 'ok') // solo lo que toca hoy o está atrasado
    .sort((a, b) => a.proxima.localeCompare(b.proxima))

  return NextResponse.json({ tareas: pendientes })
}

// POST → marcar una tarea de limpieza como hecha
export async function POST(req: NextRequest) {
  const u = await usuario()
  if (!u) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const body = await req.json()
  if (!body.tarea_id) return NextResponse.json({ error: 'Falta la tarea' }, { status: 400 })

  const { error } = await db.from('ops_ejecuciones').insert({
    tipo: 'limpieza',
    tarea_limpieza_id: body.tarea_id,
    realizado_por: u.nombre,
    tiempo_real_min: body.tiempo_real_min ? Number(body.tiempo_real_min) : null,
    a_tiempo: true,
  })
  if (error) return NextResponse.json({ error: 'No se pudo registrar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
