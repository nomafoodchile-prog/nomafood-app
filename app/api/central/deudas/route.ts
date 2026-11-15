import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCentralUser } from '@/lib/central/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CLAVE = 'deudas_detalle'
const ROLES_FIN = ['SuperAdmin', 'Administracion', 'Gerencia']

export type Deuda = {
  id: string
  acreedor: string
  tipo: string        // proveedor | prestamo | banco | tarjeta | otro
  monto: number       // saldo pendiente total
  cuota: number       // cuota mensual (0 si no aplica)
  notas: string
}

function limpiar(filas: unknown): Deuda[] {
  if (!Array.isArray(filas)) return []
  const out: Deuda[] = []
  for (const f of filas) {
    if (!f || typeof f !== 'object') continue
    const o = f as Record<string, unknown>
    const acreedor = String(o.acreedor ?? '').trim().slice(0, 120)
    const monto = Number(String(o.monto ?? '').replace(/[^0-9]/g, '')) || 0
    if (!acreedor && monto <= 0) continue
    out.push({
      id: String(o.id ?? '') || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
      acreedor: acreedor || 'Sin nombre',
      tipo: String(o.tipo ?? 'proveedor').trim().slice(0, 30) || 'proveedor',
      monto,
      cuota: Number(String(o.cuota ?? '').replace(/[^0-9]/g, '')) || 0,
      notas: String(o.notas ?? '').trim().slice(0, 200),
    })
  }
  return out
}

// GET → lista de deudas guardadas
export async function GET() {
  const u = await getCentralUser()
  if (!u.userId || !ROLES_FIN.includes(u.role || '')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const { data } = await db.from('app_config').select('valor').eq('clave', CLAVE).maybeSingle()
  let deudas: Deuda[] = []
  try {
    const v = (data as { valor: unknown } | null)?.valor
    const parsed = v ? (typeof v === 'string' ? JSON.parse(v) : v) : []
    deudas = limpiar(parsed)
  } catch { /* vacío */ }
  return NextResponse.json({ deudas })
}

// POST { deudas } → guarda la lista completa
export async function POST(req: NextRequest) {
  const u = await getCentralUser()
  if (!u.userId || !ROLES_FIN.includes(u.role || '')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  let body: Record<string, unknown> = {}
  try { body = await req.json() as Record<string, unknown> } catch { /* sin body */ }
  const deudas = limpiar(body.deudas)
  const valor = JSON.stringify(deudas)
  const db = createServerClient()
  const { data, error: eUpd } = await db.from('app_config').update({ valor }).eq('clave', CLAVE).select('clave')
  if (eUpd) return NextResponse.json({ error: 'No se pudo guardar (revisa app_config). ' + eUpd.message }, { status: 500 })
  if (!data || data.length === 0) {
    const { error: eIns } = await db.from('app_config').insert({ clave: CLAVE, valor })
    if (eIns) return NextResponse.json({ error: 'No se pudo guardar (revisa app_config). ' + eIns.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, deudas })
}
