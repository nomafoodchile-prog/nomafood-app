import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCentralUser } from '@/lib/central/guard'
import { ejecutarAgente, leerUltimo } from '@/lib/agente/ejecutar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']
type Row = Record<string, unknown>

async function alertasAbiertas(db: ReturnType<typeof createServerClient>) {
  const { data } = await db
    .from('notificaciones')
    .select('id, tipo, prioridad, area, titulo, mensaje, accion_sugerida, estado, created_at')
    .neq('estado', 'resuelta')
    .order('created_at', { ascending: false })
    .limit(200)
  return ((data as Row[] | null) || [])
}

// GET → último informe guardado + alertas abiertas (no gasta IA)
export async function GET() {
  const u = await getCentralUser()
  if (!u.userId || !ROLES.includes(u.role || '')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const [ultimo, alertas] = await Promise.all([leerUltimo(db), alertasAbiertas(db)])
  return NextResponse.json({ ultimo, alertas, iaActiva: !!process.env.ANTHROPIC_API_KEY })
}

// POST { action: 'ejecutar' } → corre un ciclo ahora (a pedido de la dueña)
export async function POST(req: NextRequest) {
  const u = await getCentralUser()
  if (!u.userId || !ROLES.includes(u.role || '')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  let body: Row = {}
  try { body = await req.json() as Row } catch { /* sin body */ }
  if (String(body.action || '') !== 'ejecutar') return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  const db = createServerClient()
  const res = await ejecutarAgente(db, 'manual')
  const alertas = await alertasAbiertas(db)
  return NextResponse.json({ ok: true, ultimo: res, alertas, iaActiva: !!process.env.ANTHROPIC_API_KEY })
}
