import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string; itemId: string } }
) {
  try {
    const supabase = createServerClient()
    const body = await req.json()

    const { data: picker } = await supabase
      .from('operators')
      .select('id')
      .eq('token', params.token)
      .single()

    if (!picker) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const itemId = req.url.split('/item/')[1]?.replace('/route', '')

    const { error } = await supabase
      .from('picking_items')
      .update({
        cantidad_pickeada: body.cantidad_pickeada,
        status: body.status,
        notas: body.notas,
        picked_at: body.picked_at,
      })
      .eq('id', itemId)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[portal/picker/item] PATCH error:', e)
    return NextResponse.json({ error: 'Error al actualizar item' }, { status: 500 })
  }
}
