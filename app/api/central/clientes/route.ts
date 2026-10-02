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

  const sel1 = await db
    .from('mayoristas')
    .select('id, nombre, empresa, email, telefono, rut, activo, created_at, marca, direccion, comuna, giro')
    .order('created_at', { ascending: false })
  let mays: any[] | null = sel1.data
  if (sel1.error) {
    // Columnas nuevas aún no existen (migración no corrida): lee sin ellas
    const r = await db.from('mayoristas')
      .select('id, nombre, empresa, email, telefono, rut, activo, created_at, marca')
      .order('created_at', { ascending: false })
    mays = r.data
  }

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

  const clientes = lista.map((m: any) => ({
    id: m.id,
    empresa: m.empresa || m.nombre || 'Sin nombre',
    contacto: m.nombre || '',
    rut: m.rut || '',
    email: m.email || '',
    telefono: m.telefono || '',
    direccion: m.direccion || '',
    giro: m.giro || '',
    comuna: m.comuna || solMap.get(m.id)?.comuna || '',
    ciudad: m.comuna || solMap.get(m.id)?.comuna || '',
    tipo: solMap.get(m.id)?.tipo || 'Mayorista',
    saldoPendiente: saldoMap.get(m.id) || 0,
    estado: m.activo === false ? 'Inactivo' : 'Activo',
    marca: m.marca || 'NOMMA FOOD',
  }))

  return NextResponse.json({ clientes })
}

// Campos obligatorios para despachar sin tener que corregir dirección a mano.
function validar(body: any): string | null {
  if (!String(body.empresa || '').trim()) return 'La razón social es obligatoria'
  if (!String(body.rut || '').trim()) return 'El RUT de la empresa es obligatorio'
  if (!String(body.telefono || '').trim()) return 'El teléfono de contacto es obligatorio'
  if (!String(body.direccion || '').trim()) return 'La dirección de despacho es obligatoria'
  return null
}

// POST /api/central/clientes → crear un cliente manualmente
export async function POST(req: NextRequest) {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const body = await req.json()
  const err = validar(body)
  if (err) return NextResponse.json({ error: err }, { status: 400 })
  const empresa = String(body.empresa).trim()

  const base: Record<string, any> = {
    nombre:   body.contacto ? String(body.contacto).trim() : empresa,
    empresa,
    rut:      String(body.rut).trim(),
    email:    body.email ? String(body.email).trim() : null,
    telefono: String(body.telefono).trim(),
    activo:   body.estado !== 'Inactivo',
  }
  const extra = { direccion: String(body.direccion).trim(), comuna: body.comuna ? String(body.comuna).trim() : null, giro: body.giro ? String(body.giro).trim() : null }

  let { data, error } = await db.from('mayoristas').insert({ ...base, ...extra }).select('id').single()
  if (error) { // columnas nuevas pueden no existir → reintenta sin ellas
    const r = await db.from('mayoristas').insert(base).select('id').single()
    data = r.data; error = r.error
  }
  if (error || !data) return NextResponse.json({ error: 'No se pudo crear el cliente' }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

// PUT /api/central/clientes → editar un cliente existente
export async function PUT(req: NextRequest) {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'Falta el cliente' }, { status: 400 })
  const err = validar(body)
  if (err) return NextResponse.json({ error: err }, { status: 400 })

  const base: Record<string, any> = {
    nombre:   body.contacto ? String(body.contacto).trim() : String(body.empresa).trim(),
    empresa:  String(body.empresa).trim(),
    rut:      String(body.rut).trim(),
    email:    body.email ? String(body.email).trim() : null,
    telefono: String(body.telefono).trim(),
    activo:   body.estado !== 'Inactivo',
  }
  const extra = { direccion: String(body.direccion).trim(), comuna: body.comuna ? String(body.comuna).trim() : null, giro: body.giro ? String(body.giro).trim() : null }

  let { error } = await db.from('mayoristas').update({ ...base, ...extra }).eq('id', body.id)
  if (error) { const r = await db.from('mayoristas').update(base).eq('id', body.id); error = r.error }
  if (error) return NextResponse.json({ error: 'No se pudo actualizar el cliente' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
