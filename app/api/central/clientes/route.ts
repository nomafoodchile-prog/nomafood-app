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

// GET /api/central/clientes → clientes REALES desde la tabla mayoristas
export async function GET() {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()

  const { data: mays } = await db
    .from('mayoristas')
    .select('id, nombre, empresa, email, telefono, rut, activo, created_at, marca')
    .order('created_at', { ascending: false })

  const lista = mays || []
  const ids = lista.map(m => m.id)

  // Datos extra (ciudad/tipo) desde la solicitud vinculada
  const solMap = new Map<string, { comuna?: string; tipo?: string }>()
  if (ids.length) {
    const { data: sols } = await db
      .from('access_requests')
      .select('mayorista_id, comuna, tipo_cliente')
      .in('mayorista_id', ids)
    for (const s of sols || []) {
      if (s.mayorista_id && !solMap.has(s.mayorista_id)) {
        solMap.set(s.mayorista_id, { comuna: s.comuna || undefined, tipo: s.tipo_cliente || undefined })
      }
    }
  }

  // Saldo pendiente = total de pedidos en curso (no entregados ni cancelados)
  const saldoMap = new Map<string, number>()
  if (ids.length) {
    const { data: peds } = await db
      .from('mayorista_pedidos')
      .select('mayorista_id, total, estado')
      .in('mayorista_id', ids)
    for (const p of peds || []) {
      if (['entregado', 'cancelado'].includes(String(p.estado))) continue
      saldoMap.set(p.mayorista_id, (saldoMap.get(p.mayorista_id) || 0) + (Number(p.total) || 0))
    }
  }

  const clientes = lista.map(m => ({
    id: m.id,
    empresa: m.empresa || m.nombre || 'Sin nombre',
    contacto: m.nombre || '',
    rut: m.rut || '',
    email: m.email || '',
    telefono: m.telefono || '',
    ciudad: solMap.get(m.id)?.comuna || '',
    tipo: solMap.get(m.id)?.tipo || 'Mayorista',
    saldoPendiente: saldoMap.get(m.id) || 0,
    estado: m.activo === false ? 'Inactivo' : 'Activo',
    marca: m.marca || 'NOMMA FOOD',
  }))

  return NextResponse.json({ clientes })
}

// POST /api/central/clientes → crear un cliente manualmente
export async function POST(req: NextRequest) {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const body = await req.json()
  const empresa = String(body.empresa || '').trim()
  if (!empresa) return NextResponse.json({ error: 'La razón social es obligatoria' }, { status: 400 })

  const { data, error } = await db.from('mayoristas').insert({
    nombre:   body.contacto ? String(body.contacto).trim() : empresa,
    empresa,
    rut:      body.rut ? String(body.rut).trim() : null,
    email:    body.email ? String(body.email).trim() : null,
    telefono: body.telefono ? String(body.telefono).trim() : null,
    activo:   body.estado !== 'Inactivo',
  }).select('id').single()

  if (error || !data) return NextResponse.json({ error: 'No se pudo crear el cliente' }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}
