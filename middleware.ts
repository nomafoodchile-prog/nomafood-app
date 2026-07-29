import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas públicas — no requieren sesión. Los portales (mayorista/chofer) y las
// APIs manejan su propia autenticación (token o RPC), por eso van aquí.
const PUBLIC_PATHS = ['/login', '/recuperar', '/mayoristas', '/portal', '/chofer', '/operario', '/api']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  // La landing pública ('/') y las rutas públicas no requieren sesión.
  if (pathname === '/' || PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Para rutas protegidas (la Central), validamos la sesión REAL contra Supabase
  // y refrescamos el token si hace falta (mantiene la sesión viva).
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  // Excluimos todos los archivos ESTÁTICOS para que el middleware no los
  // redirija a /login: cualquier ruta con extensión (`.*\..*` cubre imágenes de
  // /productos, robots.txt, sitemap.xml, manifest, etc.) más las rutas de
  // metadata sin extensión (opengraph-image, íconos). Sin esto se rompen las
  // fotos del catálogo, el indexado y los previews al compartir.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|opengraph-image|twitter-image|icon|apple-icon|.*\\..*).*)',
  ],
}
