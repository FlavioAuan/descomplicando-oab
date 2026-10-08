import bcrypt from 'bcryptjs'

// bcrypt is the same format Supabase Auth uses, so migrated hashes keep working.

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
