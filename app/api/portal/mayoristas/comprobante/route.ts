import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CLAVE = 'comprobantes_pedidos'

// POST (multipart) { pedido_id, file } con Authorization: Bearer <access_token del cliente>
// El cliente mayorista sube el comprobante de su pago (transferencia u otro).
// Se guarda en Storage (bucket público 'comprobantes') y la referencia en app_config.
export async function POST(req: NextRequest) {
  const db = createServerClient()

  // 1) Validar la sesión del cliente por el token que envía el portal
  const auth = req.headers.get('authorization') || ''
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : ''
  if (!token) return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 })
  const { data: userData } = await db.auth.getUser(token)
  const user = userData?.user
  if (!user) return NextResponse.json({ error: 'Sesión no válida' }, { status: 401 })

  // 2) Leer archivo + pedido
  let form: FormData
  try { form = await req.formData() } catch { return NextResponse.json({ error: 'Formato inválido' }, { status: 400 }) }
  const pedidoId = String(form.get('pedido_id') || '')
  const file = form.get('file')
  if (!pedidoId || !(file instanceof File)) return NextResponse.json({ error: 'Falta el archivo o el pedido' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'El archivo supera 10 MB' }, { status: 400 })

  // 3) Confirmar que el pedido pertenece a un cliente de este usuario
  const { data: mays } = await db.from('mayoristas').select('id').eq('profile_id', user.id)
  const ids = (mays || []).map(m => m.id)
  if (!ids.length) return NextResponse.json({ error: 'Sin cliente asociado' }, { status: 403 })
  const { data: pedido } = await db.from('mayorista_pedidos')
    .select('id, numero_pedido, mayorista_id').eq('id', pedidoId).maybeSingle()
  if (!pedido || !ids.includes(pedido.mayorista_id)) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

  // 4) Subir a Storage
  const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '').slice(0, 5) || 'jpg'
  const path = `comprobante-pedido-${pedidoId}-${Date.now()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())
  const { error: eUp } = await db.storage.from('comprobantes').upload(path, buf, { contentType: file.type || 'image/jpeg', upsert: true })
  if (eUp) return NextResponse.json({ error: 'No se pudo subir el comprobante. ' + eUp.message }, { status: 500 })
  const url = db.storage.from('comprobantes').getPublicUrl(path).data.publicUrl

  // 5) Guardar referencia en app_config (mapa por pedido)
  const { data: cfg } = await db.from('app_config').select('valor').eq('clave', CLAVE).maybeSingle()
  let mapa: Record<string, unknown> = {}
  try { const v = (cfg as { valor: unknown } | null)?.valor; mapa = v ? (typeof v === 'string' ? JSON.parse(v) : v) as Record<string, unknown> : {} } catch { mapa = {} }
  mapa[pedidoId] = { url, at: new Date().toISOString(), numero: pedido.numero_pedido }
  const valor = JSON.stringify(mapa)
  const { data: upd } = await db.from('app_config').update({ valor }).eq('clave', CLAVE).select('clave')
  if (!upd || upd.length === 0) await db.from('app_config').insert({ clave: CLAVE, valor })

  return NextResponse.json({ ok: true, url })
}
