import { headers } from 'next/headers'

/** Public base URL of the site (NEXT_PUBLIC_APP_URL, or derived from the request). */
export async function appUrl() {
  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/+$/, '')
  if (configured) return configured
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
