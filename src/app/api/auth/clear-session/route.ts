import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'

// A signed session whose user no longer exists would bounce between /login
// (middleware: "already logged in") and the dashboard (no user) forever.
// requireUser sends those requests here to drop the cookie first.
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url))
  response.cookies.delete(SESSION_COOKIE)
  return response
}
