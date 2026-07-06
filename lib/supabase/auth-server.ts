import { cookies } from 'next/headers'
import { createServerClient as createSSRClient } from '@supabase/ssr'

// Cliente Supabase ligado a las cookies de la petición (usa la anon key).
// Sirve para identificar y VALIDAR al usuario logueado desde componentes de
// servidor (getUser() valida el token contra Supabase, no solo lee la cookie).
export function getServerSupabase() {
  const cookieStore = cookies()
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // En un Server Component las cookies son de solo lectura: no-op seguro.
        set() {},
        remove() {},
      },
    },
  )
}
