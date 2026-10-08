import { SignJWT, jwtVerify } from 'jose'

// Edge-safe (used by middleware): no Node-only imports here.

export const SESSION_COOKIE = 'session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export interface SessionPayload {
  userId: string
}

function getSecret() {
  const secret = (process.env.AUTH_SECRET ?? '').replace(/^﻿/, '').trim()
  if (!secret) throw new Error('AUTH_SECRET env var is not set')
  return new TextEncoder().encode(secret)
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret())
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return typeof payload.userId === 'string' ? { userId: payload.userId } : null
  } catch {
    return null
  }
}
