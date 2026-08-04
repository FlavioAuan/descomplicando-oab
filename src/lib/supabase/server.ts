import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

function stripBom(s: string) {
  return s.replace(/^﻿/, '').trim()
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    stripBom(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    stripBom(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — cookies can be read but not set
          }
        },
      },
    }
  )
}

export async function createServiceClient() {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(
    stripBom(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    stripBom(process.env.SUPABASE_SERVICE_ROLE_KEY!),
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
