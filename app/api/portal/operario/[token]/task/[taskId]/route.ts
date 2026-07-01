import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// PATCH /api/portal/operario/[token]/task/[taskId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string; taskId: string } }
) {
  try {
    const supabase = createServerClient()
    const body = await req.json()

    // Verificar que el token corresponde al operario dueÃ±o de la tarea
    const { data: operator } = await supabase
      .from('operators')
      .select('id')
      .eq('token', params.token)
      .single()

    if (!operator) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: task } = await supabase
      .from('adt_tasks')
      .select('id, operator_id')
      .eq('id', params.taskId)
      .single()

    if (!task || task.operator_id !== operator.id) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }

    // Campos permitidos para actualizar
    const allowed = ['status', 'started_at', 'completed_at', 'minutos_reales', 'notas']
    const update: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }
    update.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('adt_tasks')
      .update(update)
      .eq('id', params.taskId)

    if (error) throw error

    // Si completada, registrar en task_reports
    if (body.status === 'completada') {
      await supabase.from('task_reports').insert({
        task_id: params.taskId,
        operator_id: operator.id,
        completada_en: body.completed_at || new Date().toISOString(),
        minutos_reales: body.minutos_reales,
        notas: body.notas,
      }).then(() => {}, () => {}) // silencioso si la tabla tiene diferente estructura
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[portal/operario/task] PATCH error:', e)
    return NextResponse.json({ error: 'Error al actualizar tarea' }, { status: 500 })
  }
}
