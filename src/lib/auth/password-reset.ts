import { createHash } from 'crypto'
import { SignJWT, jwtVerify } from 'jose'

// Stateless reset links: a JWT signed with AUTH_SECRET that carries a
// fingerprint of the current password hash. Once the password changes the
// fingerprint no longer matches, so each link works only once.

export const RESET_TOKEN_TTL = 60 * 60 // 1 hour

function getSecret() {
  const secret = (process.env.AUTH_SECRET ?? '').replace(/^﻿/, '').trim()
  if (!secret) throw new Error('AUTH_SECRET env var is not set')
  return new TextEncoder().encode(secret)
}

function fingerprint(passwordHash: string | null) {
  return createHash('sha256').update(passwordHash ?? '').digest('hex').slice(0, 32)
}

export async function createResetToken(userId: string, passwordHash: string | null): Promise<string> {
  return new SignJWT({ userId, purpose: 'password-reset', pwh: fingerprint(passwordHash) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${RESET_TOKEN_TTL}s`)
    .sign(getSecret())
}

/** Returns the user id when the token is valid for the user's current password. */
export async function verifyResetToken(
  token: string,
  getPasswordHash: (userId: string) => Promise<string | null | undefined>,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.purpose !== 'password-reset' || typeof payload.userId !== 'string') return null
    const current = await getPasswordHash(payload.userId)
    if (current === undefined) return null
    return payload.pwh === fingerprint(current) ? payload.userId : null
  } catch {
    return null
  }
}
