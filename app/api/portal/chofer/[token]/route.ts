import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createServerClient()
    const today = new Date().toISOString().split('T')[0]

    // Buscar chofer por token
    const { data: chofer, error: cErr } = await supabase
      .from('operators')
      .select('id, nombre, apellido, cargo, turno, token, patente:metadata->patente')
      .eq('token', params.token)
      .eq('activo', true)
      .single()

    if (cErr || !chofer) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
    }

    // Despacho del día con sus paradas
    const { data: dispatch } = await supabase
      .from('dispatches')
      .select(`
        id, fecha, status, kilometraje_inicio, kilometraje_fin,
        stops:dispatch_stops (
          id, orden, cliente_nombre, cliente_direccion, cliente_telefono,
          pedido_numero, bultos, status, entregado_at, notas, lat, lng
        )
      `)
      .eq('chofer_id', chofer.id)
      .eq('fecha', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Si no existe tabla dispatch_stops, intentamos con dispatch directamente
    // y retornamos lo que tengamos
    return NextResponse.json({
      chofer: { ...chofer, patente: (chofer as any).patente || null },
      dispatch: dispatch || null,
    })
  } catch (e) {
    console.error('[portal/chofer] GET error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
