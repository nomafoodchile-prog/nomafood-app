import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

// Roles de la Central con acceso administrativo (mismo criterio que el resto
// de los endpoints /api/central/*).
export const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion']

export async function getCentralUser(): Promise<{ userId: string | null; isAdmin: boolean; role: string | null }> {
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) return { userId: null, isAdmin: false, role: null }
  const { data: profile } = await createServerClient()
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = String(profile?.role || '')
  return { userId: user.id, isAdmin: CENTRAL_ROLES.includes(role), role }
}
