import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// GET /api/portal/operario/[token]
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createServerClient()
    const today = new Date().toISOString().split('T')[0]

    // 1. Buscar operario por token
    const { data: operator, error: opErr } = await supabase
      .from('operators')
      .select('id, nombre, apellido, cargo, turno, token')
      .eq('token', params.token)
      .eq('activo', true)
      .single()

    if (opErr || !operator) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
    }

    // 2. Tareas del día para este operario
    const { data: tasks } = await supabase
      .from('adt_tasks')
      .select('id, titulo, descripcion, tipo, status, prioridad, minutos_estimados, minutos_reales, started_at, completed_at, notas')
      .eq('operator_id', operator.id)
      .gte('fecha', today)
      .lt('fecha', new Date(Date.now() + 86400000).toISOString().split('T')[0])
      .order('prioridad', { ascending: false })

    return NextResponse.json({ operator, tasks: tasks || [], date: today })
  } catch (e) {
    console.error('[portal/operario] GET error:', e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
