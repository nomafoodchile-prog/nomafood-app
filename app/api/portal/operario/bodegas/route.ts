import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Bodegas / cámaras para el cierre de tareas del operario (campo "Ubicación final").
// La tabla `bodegas` tiene RLS solo-admin, así que el operario (no admin) que la
// leyera directo con el cliente del navegador obtendría lista VACÍA y no podría
// seleccionar destino → no podía finalizar. Aquí se lee con service-role en el
// servidor, exigiendo solo que haya una sesión iniciada.
export async function GET() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServerClient()
  const { data, error } = await db
    .from('bodegas')
    .select('id, nombre, tipo')
    .eq('activo', true)
    .order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, bodegas: data || [] })
}
