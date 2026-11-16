import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCentralUser } from '@/lib/central/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROLES = ['SuperAdmin', 'Administracion', 'Gerencia']
// Buckets públicos que la app espera. Si no existen, se crean; si existen, se dejan públicos.
const BUCKETS = ['comprobantes', 'evidencias']

async function asegurar(db: ReturnType<typeof createServerClient>, nombre: string) {
  const opts = { public: true, fileSizeLimit: 15 * 1024 * 1024 }
  const { error: eCrear } = await db.storage.createBucket(nombre, opts)
  if (!eCrear) return { bucket: nombre, estado: 'creado' }
  const msg = (eCrear.message || '').toLowerCase()
  if (msg.includes('exist') || msg.includes('already') || msg.includes('duplicate')) {
    const { error: eUpd } = await db.storage.updateBucket(nombre, opts)
    return { bucket: nombre, estado: eUpd ? 'existe (no se pudo actualizar: ' + eUpd.message + ')' : 'ya existía (público confirmado)' }
  }
  return { bucket: nombre, estado: 'error: ' + eCrear.message }
}

// GET → lista los buckets que existen hoy (diagnóstico)
export async function GET() {
  const u = await getCentralUser()
  if (!u.userId || !ROLES.includes(u.role || '')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const { data, error } = await db.storage.listBuckets()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ buckets: (data || []).map(b => ({ nombre: b.name, publico: b.public })) })
}

// POST → asegura que existan los buckets requeridos (público). Idempotente.
export async function POST() {
  const u = await getCentralUser()
  if (!u.userId || !ROLES.includes(u.role || '')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const resultados = []
  for (const b of BUCKETS) resultados.push(await asegurar(db, b))
  const { data } = await db.storage.listBuckets()
  return NextResponse.json({ ok: true, resultados, buckets: (data || []).map(b => ({ nombre: b.name, publico: b.public })) })
}
