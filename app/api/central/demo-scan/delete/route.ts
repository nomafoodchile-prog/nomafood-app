import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROLES = ['SuperAdmin', 'Administracion', 'Gerencia']
const S = (v: unknown) => (v === null || v === undefined ? '' : String(v))

// IDs de prueba detectados por el escaneo (borrado controlado: SOLO estos).
const MAYORISTAS = [
  '7186dfbd-28c2-4efb-919a-07b2a64b932f', // Prueba Central Dos
  '0a8fe91e-2d2d-4b9f-a792-b5f538b1917f', // prueba naty
  '19069ce9-9d87-4edd-8635-21588221636c', // PRUEBA FINAL Brotes - borrar
]
const MIN_PEDIDOS = [
  '032e480d-c632-4948-9b3b-010ee98fc581', // Naty Ladera (prueba) #1786
  '6ad273c9-7c00-466d-b42e-7b6cd8608622', // Diagnostico Claude DIAG-TEST-1
]
const RECETAS = ['8459517b-1ff7-4f64-9f9d-1e6ba7915001'] // Salsa bolonesa veg (demo)

export async function POST() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!ROLES.includes(S(profile?.role))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const log: string[] = []
  const del = async (tabla: string, col: string, val: string | string[]) => {
    const q = Array.isArray(val) ? db.from(tabla).delete().in(col, val) : db.from(tabla).delete().eq(col, val)
    const { error } = await q
    if (error) log.push(`⚠️ ${tabla}: ${error.message}`)
  }

  // ── Clientes mayoristas de prueba (+ sus pedidos/ítems/movimientos) ──
  for (const mid of MAYORISTAS) {
    const { data: peds } = await db.from('mayorista_pedidos').select('id').eq('mayorista_id', mid)
    const pedIds = (peds || []).map(p => S(p.id))
    if (pedIds.length) {
      await del('mayorista_pedido_items', 'pedido_id', pedIds)
      await del('fin_movimientos', 'ref_id', pedIds)
      await del('mayorista_pedidos', 'id', pedIds)
    }
    await del('mayorista_direcciones', 'mayorista_id', mid)
    await del('mayorista_usuarios', 'mayorista_id', mid)
    const { error } = await db.from('mayoristas').delete().eq('id', mid)
    if (error) {
      // Si una llave foránea impide el borrado, lo desactivo (no aparece en listados)
      await db.from('mayoristas').update({ activo: false }).eq('id', mid)
      log.push(`cliente ${mid}: no se pudo borrar (${error.message}); se desactivó.`)
    } else log.push(`cliente ${mid}: borrado (${pedIds.length} pedido(s) asociados).`)
  }

  // ── Pedidos minorista de prueba ──
  for (const pid of MIN_PEDIDOS) {
    await del('minorista_pedido_items', 'pedido_id', pid)
    await del('fin_movimientos', 'ref_id', pid)
    const { error } = await db.from('minorista_pedidos').delete().eq('id', pid)
    log.push(error ? `pedido ${pid}: ${error.message}` : `pedido minorista ${pid}: borrado.`)
  }

  // ── Recetas demo ──
  for (const rid of RECETAS) {
    const { data: vers } = await db.from('receta_versiones').select('id').eq('receta_id', rid)
    const verIds = (vers || []).map(v => S(v.id))
    if (verIds.length) {
      await del('receta_ingredientes', 'version_id', verIds)
      await del('receta_audit_log', 'version_id', verIds)
      await del('receta_versiones', 'receta_id', rid)
    }
    const { error } = await db.from('recetas').delete().eq('id', rid)
    log.push(error ? `receta ${rid}: ${error.message}` : `receta ${rid}: borrada.`)
  }

  return NextResponse.json({ ok: true, log })
}
