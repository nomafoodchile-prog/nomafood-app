import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']

async function esAdmin(): Promise<boolean> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return false
  const { data: profile } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  return CENTRAL_ROLES.includes(String(profile?.role || ''))
}

// POST /api/central/pedidos/[id]/pagar → (re)genera el link de pago Mercado Pago
// de un pedido existente y devuelve el init_point para enviárselo al cliente.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const id = params.id

  const { data: pedido } = await db.from('mayorista_pedidos')
    .select('id, mayorista_id, despacho, iva, mp_init_point')
    .eq('id', id).maybeSingle()
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

  const { data: may } = await db.from('mayoristas')
    .select('nombre, email, token').eq('id', pedido.mayorista_id).maybeSingle()

  const { data: items } = await db.from('mayorista_pedido_items')
    .select('producto_id, producto_sku, producto_nombre, cantidad, precio_final, unidad')
    .eq('pedido_id', id)

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) return NextResponse.json({ error: 'Mercado Pago no está configurado.' }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
  const token = may?.token || ''

  const mpItems: any[] = (items || []).map(it => ({
    id: it.producto_id || it.producto_sku || 'prod',
    title: it.producto_nombre,
    quantity: Number(it.cantidad),
    unit_price: Number(it.precio_final),
    currency_id: 'CLP',
  }))
  if (Number(pedido.despacho) > 0) mpItems.push({ id: 'despacho', title: 'Despacho (RM)', quantity: 1, unit_price: Number(pedido.despacho), currency_id: 'CLP' })
  if (Number(pedido.iva) > 0) mpItems.push({ id: 'iva-19', title: 'IVA 19%', quantity: 1, unit_price: Number(pedido.iva), currency_id: 'CLP' })

  try {
    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: mpItems,
        payer: { name: may?.nombre, email: may?.email || '' },
        external_reference: pedido.id,
        statement_descriptor: 'NOMMA FOOD',
        back_urls: {
          success: `${baseUrl}/portal/mayoristas/${token}/confirmacion?pedido=${pedido.id}&status=success`,
          failure: `${baseUrl}/portal/mayoristas/${token}/confirmacion?pedido=${pedido.id}&status=failure`,
          pending: `${baseUrl}/portal/mayoristas/${token}/confirmacion?pedido=${pedido.id}&status=pending`,
        },
        auto_return: 'approved',
        notification_url: `${baseUrl}/api/portal/mayoristas/webhook`,
      }),
    })
    if (!mpRes.ok) {
      const txt = await mpRes.text()
      return NextResponse.json({ error: 'Mercado Pago rechazó la solicitud. ' + txt.slice(0, 200) }, { status: 502 })
    }
    const mpData = await mpRes.json()
    await db.from('mayorista_pedidos').update({ mp_preference_id: mpData.id, mp_init_point: mpData.init_point }).eq('id', id)
    return NextResponse.json({ ok: true, init_point: mpData.init_point })
  } catch (e: any) {
    return NextResponse.json({ error: 'Error al generar el link: ' + (e?.message || '') }, { status: 500 })
  }
}
