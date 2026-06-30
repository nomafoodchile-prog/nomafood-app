import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — no auth needed
  const publicPaths = ['/login', '/recuperar', '/mayoristas', '/portal', '/api']
  const isPublic = publicPaths.some(p => pathname.startsWith(p))

  if (isPublic) return NextResponse.next()

  // Check for Supabase session cookies
  const hasSession =
    request.cookies.has('sb-access-token') ||
    request.cookies.has('sb-refresh-token') ||
    request.cookies.get('noma-auth')?.value === 'true'

  if (!hasSession && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
