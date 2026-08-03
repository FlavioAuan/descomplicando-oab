'use server'

import { createClient } from '@/lib/supabase/server'
import { usersRepository } from '../repositories/users'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
})

export async function login(formData: FormData) {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const validated = loginSchema.safeParse(raw)
  if (!validated.success) {
    return { error: validated.error.errors[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  })

  if (error) {
    return { error: 'Credenciais inválidas. Verifique seu email e senha.' }
  }

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

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      data: { name: validated.data.name },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user) {
    try {
      await usersRepository.create({
        authId: data.user.id,
        email: validated.data.email,
        name: validated.data.name,
      })
    } catch (dbError) {
      console.error('Failed to create user profile:', dbError)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const dbUser = await usersRepository.findByAuthId(user.id)
  return dbUser
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
