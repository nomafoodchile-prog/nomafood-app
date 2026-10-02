import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCentralUser } from '@/lib/central/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/central/rutas/choferes → choferes disponibles para asignar a una ruta.
// Reutiliza la tabla `drivers` existente (no se crea una tabla aparte).
export async function GET() {
  const { isAdmin } = await getCentralUser()
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const db = createServerClient()
  const { data, error } = await db.from('drivers').select('id, nombre, telefono').order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, choferes: data || [] })
}
