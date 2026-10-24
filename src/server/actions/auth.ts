'use server'

import { cookies } from 'next/headers'
import { usersRepository } from '../repositories/users'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from '@/lib/auth/session'
import { RESET_TOKEN_TTL, createResetToken, verifyResetToken } from '@/lib/auth/password-reset'
import { isEmailConfigured, sendEmail } from '@/lib/email'
import { appUrl } from '@/lib/app-url'

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

// ─── Password reset ───────────────────────────────────────────────────────────

const RESET_SENT_MESSAGE =
  'Se este email estiver cadastrado, você receberá em instantes um link para criar uma nova senha.'

export async function requestPasswordReset(formData: FormData): Promise<{ message: string } | { error: string }> {
  const parsed = z.string().email('Email inválido').safeParse(formData.get('email'))
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  if (!isEmailConfigured()) {
    console.error('[auth] password reset requested but SMTP is not configured')
    return { error: 'O envio de emails ainda não está disponível. Fale com o suporte.' }
  }

  const user = await usersRepository.findByEmail(normalizeEmail(parsed.data))
  // Same answer whether or not the email exists, so accounts can't be discovered
  if (!user) return { message: RESET_SENT_MESSAGE }

  const token = await createResetToken(user.id, (await usersRepository.findPasswordHashById(user.id)) ?? null)
  const link = `${await appUrl()}/reset-password?token=${encodeURIComponent(token)}`
  const minutes = RESET_TOKEN_TTL / 60

  try {
    await sendEmail({
      to: user.email,
      subject: 'Redefinição de senha — DescomplicandOAB',
      text: `Olá, ${user.name}!\n\nRecebemos um pedido para redefinir a senha da sua conta no DescomplicandOAB.\nPara criar uma nova senha, acesse: ${link}\n\nO link vale por ${minutes} minutos e só pode ser usado uma vez. Se você não pediu a troca, ignore este email: sua senha continua a mesma.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#111827">
  <h2 style="color:#111827">Redefinição de senha</h2>
  <p>Olá, ${escapeHtml(user.name)}!</p>
  <p>Recebemos um pedido para redefinir a senha da sua conta no <strong>DescomplicandOAB</strong>.</p>
  <p style="margin:28px 0"><a href="${link}" style="background:#C9A227;color:#111827;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Criar nova senha</a></p>
  <p style="font-size:13px;color:#6b7280">O link vale por ${minutes} minutos e só pode ser usado uma vez. Se você não pediu a troca, ignore este email: sua senha continua a mesma.</p>
  <p style="font-size:12px;color:#9ca3af;word-break:break-all">Se o botão não funcionar, copie este endereço no navegador:<br>${link}</p>
</div>`,
    })
  } catch (err) {
    console.error('[auth] failed to send password reset email', err)
    return { error: 'Não foi possível enviar o email agora. Tente novamente em alguns minutos.' }
  }

  return { message: RESET_SENT_MESSAGE }
}

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Link inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirm: z.string(),
  })
  .refine(d => d.password === d.confirm, { message: 'As senhas não conferem' })

export async function resetPassword(formData: FormData) {
  const validated = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!validated.success) return { error: validated.error.errors[0].message }

  const userId = await verifyResetToken(validated.data.token, id => usersRepository.findPasswordHashById(id))
  if (!userId) {
    return { error: 'Este link expirou ou já foi usado. Peça um novo link de redefinição.' }
  }

  await usersRepository.setPassword(userId, await hashPassword(validated.data.password))
  await startSession(userId)
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
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
  // Clearing the cookie avoids a redirect loop when the session's user was deleted
  if (!user) redirect('/api/auth/clear-session')
  return user
}

export async function requireRole(...roles: string[]) {
  const user = await requireUser()
  if (!roles.includes(user.role)) redirect('/dashboard')
  return user
}
