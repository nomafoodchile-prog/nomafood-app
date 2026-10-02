import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCentralUser } from '@/lib/central/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/central/comunicaciones?ids=a,b,c → comunicaciones por pedido
export async function GET(req: NextRequest) {
  const { isAdmin } = await getCentralUser()
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const idsParam = req.nextUrl.searchParams.get('ids') || ''
  const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean)
  const db = createServerClient()
  let q = db.from('minorista_comunicaciones')
    .select('id, minorista_pedido_id, tipo, canal, estado, texto, destino, created_at')
    .order('created_at', { ascending: true })
  if (ids.length) q = q.in('minorista_pedido_id', ids)
  const { data, error } = await q.limit(1000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const porPedido: Record<string, any[]> = {}
  for (const c of data || []) {
    const k = String(c.minorista_pedido_id)
    ;(porPedido[k] = porPedido[k] || []).push(c)
  }
  return NextResponse.json({ ok: true, porPedido })
}

// POST /api/central/comunicaciones → registra un envío (cuando se abre wa.me)
// body: { minorista_pedido_id, tipo, texto, destino, marca }
export async function POST(req: NextRequest) {
  const { isAdmin, userId } = await getCentralUser()
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  let b: any = {}
  try { b = await req.json() } catch { /* vacío */ }
  if (!b.minorista_pedido_id || !b.tipo) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  const db = createServerClient()
  const { data, error } = await db.from('minorista_comunicaciones').insert({
    minorista_pedido_id: b.minorista_pedido_id,
    tipo: String(b.tipo),
    canal: 'whatsapp',
    marca: b.marca || null,
    destino: b.destino || null,
    texto: b.texto || null,
    estado: 'enviado',
    enviado_por: userId,
  }).select('id, tipo, created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, comunicacion: data })
}
