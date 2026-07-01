import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// POST /api/portal/operario/[token]/reporte
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createServerClient()
    const body = await req.json()

    const { data: operator } = await supabase
      .from('operators')
      .select('id, nombre, apellido')
      .eq('token', params.token)
      .single()

    if (!operator) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    await supabase.from('audit_logs').insert({
      table_name: 'reportes_diarios',
      action: 'INSERT',
      new_data: {
        operator_id: operator.id,
        operator_nombre: `${operator.nombre} ${operator.apellido}`,
        fecha: new Date().toISOString().split('T')[0],
        turno: body.turno,
        tareas_completadas: body.tareas_completadas,
        incidencias: body.incidencias,
        observaciones: body.observaciones,
      },
      user_id: null,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[portal/operario/reporte] POST error:', e)
    return NextResponse.json({ error: 'Error al registrar reporte' }, { status: 500 })
  }
}
