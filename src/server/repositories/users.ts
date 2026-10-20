import { eq, getTableColumns, sql } from 'drizzle-orm'
import { BaseRepository } from './base'
import { users } from '@/lib/db/schema'
import type { User, Role } from '@/types'

// Never select password_hash by default — user objects reach client components.
const { passwordHash: _passwordHash, ...publicColumns } = getTableColumns(users)

export class UsersRepository extends BaseRepository {
  async findByAuthId(authId: string): Promise<User | null> {
    const result = await this.db
      .select(publicColumns)
      .from(users)
      .where(eq(users.authId, authId))
      .limit(1)

    return (result[0] as User) || null
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db
      .select(publicColumns)
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    return (result[0] as User) || null
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .select(publicColumns)
      .from(users)
      .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
      .limit(1)

    return (result[0] as User) || null
  }

  async findCredentialsByEmail(email: string): Promise<{ id: string; passwordHash: string | null } | null> {
    const result = await this.db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
      .limit(1)

    return result[0] || null
  }

  /** undefined when the user doesn't exist, null when it has no password yet. */
  async findPasswordHashById(id: string): Promise<string | null | undefined> {
    const result = await this.db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    return result[0] ? result[0].passwordHash : undefined
  }

  async setPassword(id: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id))
  }

  async create(data: {
    authId?: string
    email: string
    name: string
    passwordHash?: string
    role?: Role
  }): Promise<User> {
    const id = crypto.randomUUID()
    await this.db
      .insert(users)
      .values({
        id,
        authId: data.authId ?? crypto.randomUUID(),
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        role: data.role || 'student',
      })

    return (await this.findById(id)) as User
  }

  async update(id: string, data: Partial<{
    name: string
    avatarUrl: string
    role: Role
    xp: number
    level: number
    streak: number
    lastActiveAt: Date
  }>): Promise<User> {
    await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))

    return (await this.findById(id)) as User
  }

  async addXp(id: string, xp: number): Promise<User> {
    const user = await this.findById(id)
    if (!user) throw new Error('User not found')

    const newXp = user.xp + xp
    const { calculateLevel } = await import('@/lib/utils')
    const newLevel = calculateLevel(newXp)

    return this.update(id, { xp: newXp, level: newLevel })
  }

  async incrementStreak(id: string): Promise<void> {
    const user = await this.findById(id)
    if (!user) return

    const today = new Date()
    const lastActive = user.lastActiveAt
    const isYesterday =
      lastActive &&
      Math.floor((today.getTime() - lastActive.getTime()) / 86400000) === 1

    await this.update(id, {
      streak: isYesterday ? user.streak + 1 : 1,
      lastActiveAt: today,
    })
  }

  async listAll(): Promise<User[]> {
    return this.db.select(publicColumns).from(users) as Promise<User[]>
  }

  async countByRole(role: Role): Promise<number> {
    const result = await this.db
      .select({ count: users.id })
      .from(users)
      .where(eq(users.role, role))

    return result.length
  }
}

export const usersRepository = new UsersRepository()
