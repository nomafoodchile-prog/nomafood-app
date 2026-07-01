import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// POST /api/portal/chofer/[token]/gasto
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
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
      .from('driver_expenses')
      .insert({
        chofer_id: chofer.id,
        dispatch_id: body.dispatch_id,
        tipo: body.tipo,
        monto: body.monto,
        descripcion: body.descripcion,
        fecha: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      })

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[portal/chofer/gasto] POST error:', e)
    return NextResponse.json({ error: 'Error al registrar gasto' }, { status: 500 })
  }
}
