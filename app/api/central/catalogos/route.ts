import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']
const TIPOS_CAT = ['categoria', 'subcategoria', 'ubicacion', 'area', 'condicion_almacenamiento', 'tipo_embalaje']

async function esAdmin(): Promise<boolean> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return false
  const { data: p } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  return CENTRAL_ROLES.includes((p?.role as string | undefined) || '')
}

// POST /api/central/catalogos — agregar un valor a un catálogo interno (solo admin)
export async function POST(req: NextRequest) {
  if (!(await esAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: { tipo?: string; valor?: string } = {}
  try { body = await req.json() } catch { /* sin body */ }
  const tipo = String(body.tipo || '')
  const valor = String(body.valor || '').trim()
  if (!TIPOS_CAT.includes(tipo) || !valor) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { error } = await createServerClient().from('catalogos').insert({ tipo, valor })
  if (error && !/duplicate|unique/i.test(error.message)) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
