import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROLES = ['SuperAdmin', 'Administracion', 'Gerencia']
const DE = 'Aldea Vegetal'
const A = 'Brotes Asian Street'

async function esAdmin(): Promise<boolean> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return false
  const { data: p } = await createServerClient().from('profiles').select('role').eq('id', user.id).maybeSingle()
  return ROLES.includes(String(p?.role || ''))
}

type Fila = { id: string; nombre: string | null }

// Reemplaza "Aldea Vegetal" -> "Brotes Asian Street" en nombres de organizaciones
// y sucursales (mayoristas). Idempotente: tras correr, no quedan coincidencias.
export async function POST() {
  if (!await esAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const cambios: { tabla: string; id: string; antes: string; ahora: string }[] = []

  for (const tabla of ['organizaciones', 'mayoristas']) {
    const { data, error } = await db.from(tabla).select('id, nombre').ilike('nombre', `%${DE}%`)
    if (error) return NextResponse.json({ error: `${tabla}: ${error.message}` }, { status: 500 })
    for (const f of (data as Fila[] | null) || []) {
      const antes = String(f.nombre || '')
      const ahora = antes.split(DE).join(A)
      if (ahora === antes) continue
      const { error: eUpd } = await db.from(tabla).update({ nombre: ahora }).eq('id', f.id)
      if (eUpd) return NextResponse.json({ error: `${tabla} ${f.id}: ${eUpd.message}`, cambios }, { status: 500 })
      cambios.push({ tabla, id: f.id, antes, ahora })
    }
  }

  return NextResponse.json({ ok: true, total: cambios.length, cambios })
}
