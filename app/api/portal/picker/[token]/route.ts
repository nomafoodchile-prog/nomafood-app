import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createServerClient()
    const today = new Date().toISOString().split('T')[0]

    // Buscar picker por token
    const { data: picker, error: pErr } = await supabase
      .from('operators')
      .select('id, nombre, apellido, token')
      .eq('token', params.token)
      .eq('activo', true)
      .single()

    if (pErr || !picker) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
    }

    // Sesión de picking del día con sus items
    const { data: session } = await supabase
      .from('picking_tasks')
      .select(`
        id, fecha, status,
        items:picking_items (
          id, producto_nombre, producto_sku, cantidad_pedida, cantidad_pickeada,
          unidad, ubicacion_bodega, pedido_numero, status, notas
        )
      `)
      .eq('picker_id', picker.id)
      .gte('fecha', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ picker, session: session || null })
  } catch (e) {
    console.error('[portal/picker] GET error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
