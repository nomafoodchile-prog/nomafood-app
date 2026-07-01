import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: { token: string; dispatchId: string } }) {
  try {
    const supabase = createServerClient()
    const body = await req.json()
    const { data: chofer } = await supabase.from('operators').select('id').eq('token', params.token).single()
    if (!chofer) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const update: Record<string, any> = { status: body.status }
    if (body.started_at) update.started_at = body.started_at
    const { error } = await supabase.from('dispatches').update(update).eq('id', params.dispatchId).eq('chofer_id', chofer.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
