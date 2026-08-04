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

// GET → máquinas con ficha, sus tareas de mantención (+próxima/estado) e historial
export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()

  const { data: areas } = await db.from('ops_areas').select('id, nombre').eq('activo', true).order('nombre')
  const { data: maquinas } = await db.from('ops_maquinas')
    .select('id, codigo, nombre, marca_modelo, n_serie, area_id, fecha_compra, garantia_hasta, proveedor, manual_url, estado')
    .eq('activo', true).order('nombre')
  const { data: tareas } = await db.from('ops_mantencion_tareas')
    .select('id, maquina_id, nombre, pasos, tiempo_estimado_min, recurrencia, requiere_tecnico, orden')
    .eq('activo', true).order('orden')
  const { data: ejec } = await db.from('ops_ejecuciones')
    .select('maquina_id, tarea_mantencion_id, fecha_realizada, realizado_por, notas')
    .eq('tipo', 'mantencion').order('fecha_realizada', { ascending: false })

  // última ejecución por tarea (para próxima fecha)
  const ultimaTarea = new Map<string, any>()
  const histMaquina = new Map<string, any[]>()
  for (const e of ejec || []) {
    if (e.tarea_mantencion_id && !ultimaTarea.has(e.tarea_mantencion_id)) ultimaTarea.set(e.tarea_mantencion_id, e)
    if (e.maquina_id) { const arr = histMaquina.get(e.maquina_id) || []; arr.push(e); histMaquina.set(e.maquina_id, arr) }
  }
  const areaMap = new Map<string, string>((areas || []).map(a => [a.id, a.nombre]))

  const result = (maquinas || []).map(m => ({
    ...m,
    area: m.area_id ? areaMap.get(m.area_id) || '' : '',
    historial: (histMaquina.get(m.id) || []).slice(0, 20),
    tareas: (tareas || []).filter(t => t.maquina_id === m.id).map(t => {
      const ultima = ultimaTarea.get(t.id) || null
      const proxima = proximaDe(ultima?.fecha_realizada, t.recurrencia)
      return { ...t, pasos: Array.isArray(t.pasos) ? t.pasos : [], ultima, proxima, estado: estadoDe(proxima) }
    }),
  }))

  return NextResponse.json({ maquinas: result, areas: areas || [] })
}

// POST → crear máquina / crear tarea de mantención / marcar hecha
export async function POST(req: NextRequest) {
  const a = await auth()
  if (!a) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const body = await req.json()

  if (body.action === 'maquina') {
    const nombre = String(body.nombre || '').trim()
    if (!nombre) return NextResponse.json({ error: 'Falta el nombre de la máquina' }, { status: 400 })
    const { error } = await db.from('ops_maquinas').insert({
      codigo: body.codigo ? String(body.codigo).trim() : null,
      nombre,
      marca_modelo: body.marca_modelo ? String(body.marca_modelo).trim() : null,
      n_serie: body.n_serie ? String(body.n_serie).trim() : null,
      area_id: body.area_id || null,
      fecha_compra: body.fecha_compra || null,
      garantia_hasta: body.garantia_hasta || null,
      proveedor: body.proveedor ? String(body.proveedor).trim() : null,
      manual_url: body.manual_url ? String(body.manual_url).trim() : null,
      estado: body.estado || 'operativa',
    })
    if (error) return NextResponse.json({ error: 'No se pudo crear la máquina' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'tarea') {
    const nombre = String(body.nombre || '').trim()
    if (!body.maquina_id || !nombre) return NextResponse.json({ error: 'Falta máquina o nombre' }, { status: 400 })
    const pasos = Array.isArray(body.pasos) ? body.pasos.map((p: any) => String(p)).filter(Boolean) : []
    const { error } = await db.from('ops_mantencion_tareas').insert({
      maquina_id: body.maquina_id,
      nombre,
      pasos,
      tiempo_estimado_min: body.tiempo_estimado_min ? Number(body.tiempo_estimado_min) : null,
      recurrencia: body.recurrencia || 'mensual',
      requiere_tecnico: !!body.requiere_tecnico,
    })
    if (error) return NextResponse.json({ error: 'No se pudo crear la tarea' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'ejecutar') {
    if (!body.tarea_id || !body.maquina_id) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    const { error } = await db.from('ops_ejecuciones').insert({
      tipo: 'mantencion',
      tarea_mantencion_id: body.tarea_id,
      maquina_id: body.maquina_id,
      realizado_por: body.realizado_por ? String(body.realizado_por).trim() : a.email,
      tiempo_real_min: body.tiempo_real_min ? Number(body.tiempo_real_min) : null,
      a_tiempo: true,
      notas: body.notas ? String(body.notas).trim() : null,
    })
    if (error) return NextResponse.json({ error: 'No se pudo registrar' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
