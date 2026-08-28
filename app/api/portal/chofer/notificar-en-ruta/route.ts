import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'
import { enviarPedidoEnRuta } from '@/lib/pedido-emails'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/portal/chofer/notificar-en-ruta  { route_id }
// Se llama DESPUÉS de iniciar_ruta(). NO cambia estados: solo avisa por correo
// a cada cliente que su pedido va en camino. Best-effort: nunca bloquea la ruta.
export async function POST(req: NextRequest) {
  try {
    const { data: { user } } = await getServerSupabase().auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const routeId = String(body.route_id || '')
    if (!routeId) return NextResponse.json({ error: 'Falta route_id' }, { status: 400 })

    const db = createServerClient()

    // El chofer solo puede notificar SUS pedidos
    const { data: driver } = await db.from('drivers').select('id, nombre, telefono').eq('profile_id', user.id).maybeSingle()
    if (!driver) return NextResponse.json({ error: 'Sin chofer asociado' }, { status: 403 })

    // Pedidos que acaban de pasar a "en ruta" en esta ruta, de este chofer
    const { data: peds } = await db.from('mayorista_pedidos')
      .select('numero_pedido, mayorista_id')
      .eq('route_id', routeId)
      .eq('chofer_id', driver.id)
      .eq('estado_entrega', 'en_ruta')

    if (!peds || peds.length === 0) return NextResponse.json({ ok: true, enviados: 0 })

    // Emails de los clientes (una sola consulta)
    const mayIds = [...new Set(peds.map(p => p.mayorista_id).filter(Boolean))] as string[]
    const emailMap = new Map<string, { email: string | null; nombre: string | null }>()
    if (mayIds.length) {
      const { data: mays } = await db.from('mayoristas').select('id, email, nombre').in('id', mayIds)
      for (const m of mays || []) emailMap.set(m.id, { email: m.email, nombre: m.nombre })
    }

    const tel = driver.telefono ? String(driver.telefono) : null
    let enviados = 0
    for (const p of peds) {
      const cli = emailMap.get(String(p.mayorista_id))
      if (!cli?.email) continue
      const r = await enviarPedidoEnRuta({
        to: cli.email,
        nombre: cli.nombre,
        numero: p.numero_pedido,
        chofer: driver.nombre || null,
        telefono: tel,
      })
      if (r.ok) enviados++
    }

    return NextResponse.json({ ok: true, enviados, total: peds.length })
  } catch (e) {
    console.error('[chofer/notificar-en-ruta] error:', e)
    // No rompemos la operación del chofer por un fallo de correo
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
