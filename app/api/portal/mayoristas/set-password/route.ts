import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createHash } from 'node:crypto'

export const runtime = 'nodejs'

// POST { token, password }
// Valida el token propio (durable) y establece la contraseña del cliente mayorista.
// No depende del enlace magico de Supabase (que Gmail rompe).
export async function POST(req: NextRequest) {
  let body: { token?: string; password?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }) }

  const token = (body.token || '').trim()
  const password = body.password || ''
  if (!token) return NextResponse.json({ error: 'Enlace inválido' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })

  const db = createServerClient()
  const hash = createHash('sha256').update(token).digest('hex')

  const { data: may } = await db
    .from('mayoristas')
    .select('id, profile_id, clave_token_exp')
    .eq('clave_token', hash)
    .maybeSingle()

  if (!may || !may.profile_id) return NextResponse.json({ error: 'Enlace inválido o expirado' }, { status: 400 })
  if (!may.clave_token_exp || new Date(may.clave_token_exp).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Enlace inválido o expirado' }, { status: 400 })
  }

  const { error: upErr } = await db.auth.admin.updateUserById(may.profile_id, { password })
  if (upErr) return NextResponse.json({ error: 'No se pudo guardar la contraseña: ' + upErr.message }, { status: 500 })

  // Token de un solo uso: invalidar
  await db.from('mayoristas').update({ clave_token: null, clave_token_exp: null }).eq('id', may.id)

  return NextResponse.json({ ok: true })
}
