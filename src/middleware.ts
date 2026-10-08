import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session'

export async function middleware(request: NextRequest) {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register')

  const isProtectedPage = request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/super-admin') ||
    request.nextUrl.pathname.startsWith('/student') ||
    request.nextUrl.pathname.startsWith('/dashboard')

  if (!session && isProtectedPage) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    // Drop an invalid/expired cookie so the user isn't stuck in a loop
    response.cookies.delete(SESSION_COOKIE)
    return response
  }

  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
