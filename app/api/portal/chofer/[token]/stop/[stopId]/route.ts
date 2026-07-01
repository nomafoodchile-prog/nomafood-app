import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// PATCH /api/portal/chofer/[token]/stop/[stopId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string; stopId: string } }
) {
  try {
    const supabase = createServerClient()
    const body = await req.json()

    const { data: chofer } = await supabase
      .from('operators')
      .select('id')
      .eq('token', params.token)
      .single()

    if (!chofer) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { error } = await supabase
      .from('dispatch_stops')
      .update({
        status: body.status,
        entregado_at: body.entregado_at,
        notas: body.notas,
      })
      .eq('id', params.stopId)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[portal/chofer/stop] PATCH error:', e)
    return NextResponse.json({ error: 'Error al actualizar parada' }, { status: 500 })
  }
}
