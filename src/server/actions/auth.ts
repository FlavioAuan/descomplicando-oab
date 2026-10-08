'use server'

import { cookies } from 'next/headers'
import { usersRepository } from '../repositories/users'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from '@/lib/auth/session'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
})

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

async function startSession(userId: string) {
  const token = await signSession({ userId })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
}

export async function login(formData: FormData) {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const validated = loginSchema.safeParse(raw)
  if (!validated.success) {
    return { error: validated.error.errors[0].message }
  }

  const credentials = await usersRepository.findCredentialsByEmail(normalizeEmail(validated.data.email))
  const valid =
    credentials?.passwordHash != null &&
    (await verifyPassword(validated.data.password, credentials.passwordHash))

  if (!credentials || !valid) {
    return { error: 'Credenciais inválidas. Verifique seu email e senha.' }
  }

  await startSession(credentials.id)
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function register(formData: FormData) {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: formData.get('name') as string,
  }

  const validated = registerSchema.safeParse(raw)
  if (!validated.success) {
    return { error: validated.error.errors[0].message }
  }

  const email = normalizeEmail(validated.data.email)
  if (await usersRepository.findByEmail(email)) {
    return { error: 'Este email já está cadastrado.' }
  }

  const user = await usersRepository.create({
    email,
    name: validated.data.name,
    passwordHash: await hashPassword(validated.data.password),
  })

  await startSession(user.id)
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const session = await verifySession(cookieStore.get(SESSION_COOKIE)?.value)
  if (!session) return null

  return usersRepository.findById(session.userId)
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

export async function requireRole(...roles: string[]) {
  const user = await requireUser()
  if (!roles.includes(user.role)) redirect('/dashboard')
  return user
}
