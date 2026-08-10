import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']
const hoyCL = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())

async function esAdmin(): Promise<boolean> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return false
  const { data: p } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  return CENTRAL_ROLES.includes(String(p?.role || ''))
}

// GET → todas las facturas Aldea (con sucursal)
export async function GET() {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const { data } = await db.from('aldea_facturas')
    .select('id, mayorista_id, numero, monto, fecha_emision, fecha_vencimiento, estado, created_at')
    .order('created_at', { ascending: false }).limit(300)

  const sucIds = [...new Set((data || []).map(f => f.mayorista_id))]
  const sucMap = new Map<string, string>()
  if (sucIds.length) { const { data: s } = await db.from('mayoristas').select('id, nombre').in('id', sucIds); for (const x of s || []) sucMap.set(x.id, x.nombre) }

  const hoy = hoyCL()
  const facturas = (data || []).map(f => {
    let estado_real = f.estado
    if (f.estado === 'por_pagar' && f.fecha_vencimiento && String(f.fecha_vencimiento) < hoy) estado_real = 'vencida'
    return { ...f, monto: Number(f.monto), estado_real, sucursal: sucMap.get(f.mayorista_id) || 'Sucursal' }
  })
  return NextResponse.json({ facturas })
}

// POST → registrar una factura
export async function POST(req: NextRequest) {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const body = await req.json()
  const mayorista_id = String(body.mayorista_id || '')
  if (!mayorista_id) return NextResponse.json({ error: 'Elige la sucursal.' }, { status: 400 })
  if (!(Number(body.monto) > 0)) return NextResponse.json({ error: 'Monto inválido.' }, { status: 400 })

  const { data: may } = await db.from('mayoristas').select('organizacion_id').eq('id', mayorista_id).maybeSingle()
  const { error } = await db.from('aldea_facturas').insert({
    mayorista_id,
    organizacion_id: may?.organizacion_id || null,
    numero: body.numero ? String(body.numero).trim() : null,
    monto: Number(body.monto),
    fecha_emision: body.fecha_emision || null,
    fecha_vencimiento: body.fecha_vencimiento || null,
    solicitud_id: body.solicitud_id || null,
    estado: 'por_pagar',
  })
  if (error) return NextResponse.json({ error: 'No se pudo registrar la factura.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PATCH → marcar pagada / por pagar
export async function PATCH(req: NextRequest) {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const body = await req.json()
  if (!body.id || !['por_pagar', 'pagada'].includes(String(body.estado))) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const { error } = await db.from('aldea_facturas').update({ estado: body.estado, updated_at: new Date().toISOString() }).eq('id', body.id)
  if (error) return NextResponse.json({ error: 'No se pudo actualizar.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
