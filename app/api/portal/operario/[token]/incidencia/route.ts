import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// POST /api/portal/operario/[token]/incidencia
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

    if (!operator) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Insertar en machine_failures o tabla genérica de incidencias
    // Usamos machine_failures para fallos de máquina, cleaning_reports para otros
    if (body.tipo === 'maquina') {
      await supabase.from('machine_failures').insert({
        reported_by: operator.id,
        descripcion: body.descripcion,
        urgencia: body.urgencia,
        reported_at: new Date().toISOString(),
        status: 'abierto',
      })
    } else {
      // Para otras incidencias usamos audit_logs como registro genérico
      await supabase.from('audit_logs').insert({
        table_name: 'incidencias',
        action: 'INSERT',
        new_data: {
          tipo: body.tipo,
          descripcion: body.descripcion,
          urgencia: body.urgencia,
          operator_id: operator.id,
          operator_nombre: `${operator.nombre} ${operator.apellido}`,
          fecha: new Date().toISOString(),
        },
        user_id: null,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[portal/operario/incidencia] POST error:', e)
    return NextResponse.json({ error: 'Error al registrar incidencia' }, { status: 500 })
  }
}
