/**
 * Define (ou redefine) a senha de um usuário direto no banco.
 * Também serve para criar o primeiro super-admin.
 *
 *   npx tsx scripts/set-password.ts email@exemplo.com NovaSenha123
 *   npx tsx scripts/set-password.ts email@exemplo.com NovaSenha123 "Nome" super_admin   (cria se não existir)
 */

import fs from 'fs'
import path from 'path'
import type { Role } from '../src/types'

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim()
  }
}

async function main() {
  const [email, password, name, role] = process.argv.slice(2)
  if (!email || !password) {
    console.error('Uso: npx tsx scripts/set-password.ts <email> <senha> [nome] [role]')
    process.exit(1)
  }
  if (password.length < 6) {
    console.error('A senha deve ter no mínimo 6 caracteres.')
    process.exit(1)
  }

  const { usersRepository } = await import('../src/server/repositories/users')
  const { hashPassword } = await import('../src/lib/auth/password')
  const passwordHash = await hashPassword(password)

  const existing = await usersRepository.findByEmail(email)
  if (existing) {
    await usersRepository.setPassword(existing.id, passwordHash)
    if (role) await usersRepository.update(existing.id, { role: role as Role })
    console.log(`Senha atualizada para ${existing.email}${role ? ` (role: ${role})` : ''}`)
  } else if (name) {
    const user = await usersRepository.create({
      email: email.trim().toLowerCase(),
      name,
      passwordHash,
      role: (role || 'student') as Role,
    })
    console.log(`Usuário criado: ${user.email} (role: ${user.role})`)
  } else {
    console.error('Usuário não encontrado. Para criar, informe também o nome (e opcionalmente o role).')
    process.exit(1)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
