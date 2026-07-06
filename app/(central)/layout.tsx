import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { IncidenciaAlert } from '@/components/central/IncidenciaAlert'
import { getServerSupabase } from '@/lib/supabase/auth-server'
import { createServerClient } from '@/lib/supabase/server'

// Roles internos autorizados para abrir la Central Administrativa.
// Los roles externos (clientes, choferes, operarios) NO pueden entrar aquí:
// se les redirige a su propio portal.
const CENTRAL_ROLES = ['SuperAdmin', 'Administracion', 'Gerencia', 'EncargadoProduccion', 'Armado']

export default async function CentralLayout({ children }: { children: React.ReactNode }) {
  // 1) Validar sesión real (getUser valida el token contra Supabase)
  const { data: { user } } = await getServerSupabase().auth.getUser()
  if (!user) redirect('/login')

  // 2) Leer el rol con el service-role (bypass RLS → nunca bloquea por permisos de tabla)
  const { data: profile } = await createServerClient()
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = profile?.role as string | undefined

  // 3) Gate por rol: solo roles internos entran a la Central
  if (!role || !CENTRAL_ROLES.includes(role)) {
    if (role === 'Mayorista') redirect('/portal/mayoristas/cuenta')
    if (role === 'Chofer') redirect('/chofer')
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-[#f5f0e8] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
      <IncidenciaAlert />
    </div>
  )
}
