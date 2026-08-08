import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/portal/aldea/session
// Devuelve el contexto Aldea del usuario logueado: organización, rol y sucursales visibles.
// - admin_general  → ve TODAS las sucursales de su organización
// - encargado_local → ve solo la(s) sucursal(es) vinculada(s)
export async function GET() {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = createServerClient()

  const { data: vinculos } = await db.from('mayorista_usuarios')
    .select('organizacion_id, mayorista_id, rol, activo')
    .eq('profile_id', user.id).eq('activo', true)

  if (!vinculos || vinculos.length === 0) {
    return NextResponse.json({ error: 'Tu cuenta no está habilitada para el portal Aldea.' }, { status: 403 })
  }

  const organizacion_id = vinculos[0].organizacion_id
  const esAdmin = vinculos.some(v => v.rol === 'admin_general')

  const { data: org } = await db.from('organizaciones')
    .select('id, nombre, tipo').eq('id', organizacion_id).maybeSingle()

  // Perfil (nombre para saludar)
  const { data: perfil } = await db.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle()

  // Sucursales visibles
  let sucursales: { id: string; nombre: string }[] = []
  if (esAdmin) {
    const { data } = await db.from('mayoristas')
      .select('id, nombre').eq('organizacion_id', organizacion_id).eq('es_sucursal', true).eq('activo', true)
      .order('nombre')
    sucursales = data || []
  } else {
    const ids = vinculos.map(v => v.mayorista_id).filter(Boolean) as string[]
    if (ids.length) {
      const { data } = await db.from('mayoristas').select('id, nombre').in('id', ids).order('nombre')
      sucursales = data || []
    }
  }

  return NextResponse.json({
    organizacion: org ? { id: org.id, nombre: org.nombre } : null,
    rol: esAdmin ? 'admin_general' : 'encargado_local',
    rol_label: esAdmin ? 'Administrador General' : 'Encargado de Local',
    usuario: { nombre: perfil?.full_name || perfil?.email || 'Usuario', email: perfil?.email || user.email },
    sucursales,
  })
}
