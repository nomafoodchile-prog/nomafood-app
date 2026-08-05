import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST /api/portal/mayoristas/[token]/direccion
// El cliente propone una nueva dirección de despacho. Queda en estado 'pendiente'
// hasta que la Central la apruebe (recién ahí puede usarse en el checkout).
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createServerClient()
    const body = await req.json()

    const { data: mayorista } = await supabase
      .from('mayoristas')
      .select('id')
      .eq('token', params.token)
      .eq('activo', true)
      .single()

    if (!mayorista) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const direccion = String(body.direccion || '').trim()
    if (!direccion) {
      return NextResponse.json({ error: 'La dirección es obligatoria.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('mayorista_direcciones')
      .insert({
        mayorista_id: mayorista.id,
        alias:    body.alias    ? String(body.alias).trim()    : null,
        direccion,
        comuna:   body.comuna   ? String(body.comuna).trim()   : null,
        contacto: body.contacto ? String(body.contacto).trim() : null,
        telefono: body.telefono ? String(body.telefono).trim() : null,
        estado:   'aprobada', // auto-aprobada: la clienta la puede usar de inmediato en el checkout
      })
      .select('id')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'No se pudo guardar la dirección.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, id: data.id })
  } catch (e) {
    console.error('[portal/mayoristas/direccion] POST error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
