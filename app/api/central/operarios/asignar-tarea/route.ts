import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']
const TIPOS = ['produccion', 'preelaboracion', 'limpieza', 'orden']
const PRIORIDADES = ['alta', 'media', 'baja']

// POST /api/central/operarios/asignar-tarea
// Crea una tarea (op_tareas) para un operario. Aparece en su portal en la fecha indicada.
export async function POST(req: NextRequest) {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const db = createServerClient()
  const { data: me } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!ADMIN_ROLES.includes(String(me?.role || ''))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const b = await req.json().catch(() => ({}))
  const operarioId = String(b.operario_id || '')
  const titulo = String(b.titulo || '').trim()
  if (!operarioId) return NextResponse.json({ error: 'Falta el operario.' }, { status: 400 })
  if (!titulo) return NextResponse.json({ error: 'El título de la tarea es obligatorio.' }, { status: 400 })

  const tipo = TIPOS.includes(String(b.tipo)) ? String(b.tipo) : 'produccion'
  const prioridad = PRIORIDADES.includes(String(b.prioridad)) ? String(b.prioridad) : 'media'
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(b.fecha)) ? String(b.fecha) : undefined // undefined → default current_date
  const cantidad = (b.cantidad === '' || b.cantidad == null) ? null : Number(b.cantidad)
  const mins = (b.tiempo_estimado_min === '' || b.tiempo_estimado_min == null) ? 0 : Number(b.tiempo_estimado_min)

  const fila: Record<string, unknown> = {
    operario_id: operarioId,
    tipo,
    prioridad,
    area: b.area ? String(b.area).trim() : null,
    titulo,
    cantidad_asignada: cantidad != null && Number.isFinite(cantidad) ? cantidad : null,
    unidad: b.unidad ? String(b.unidad).trim() : null,
    tiempo_estimado_min: Number.isFinite(mins) ? mins : 0,
    instrucciones: b.instrucciones ? String(b.instrucciones).trim() : null,
    estado: 'pendiente',
    es_demo: false,
  }
  if (fecha) fila.fecha = fecha
  // Receta vinculada: el operario ve su paso a paso e ingredientes. Las "tandas"
  // se derivan de cantidad_asignada ÷ rendimiento, así que no hace falta guardarlas.
  if (b.receta_version_id) fila.receta_version_id = String(b.receta_version_id)

  const { error } = await db.from('op_tareas').insert(fila)
  if (error) return NextResponse.json({ error: 'No se pudo asignar la tarea. ' + error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
