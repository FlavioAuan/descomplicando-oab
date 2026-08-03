import { eq } from 'drizzle-orm'
import { BaseRepository } from './base'
import { users } from '@/lib/db/schema'
import type { User, Role } from '@/types'

export class UsersRepository extends BaseRepository {
  async findByAuthId(authId: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.authId, authId))
      .limit(1)

    return (result[0] as User) || null
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    return (result[0] as User) || null
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    return (result[0] as User) || null
  }

  async create(data: {
    authId: string
    email: string
    name: string
    role?: Role
  }): Promise<User> {
    const result = await this.db
      .insert(users)
      .values({
        authId: data.authId,
        email: data.email,
        name: data.name,
        role: data.role || 'student',
      })
      .returning()

    return result[0] as User
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
    const result = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()

    return result[0] as User
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
    return this.db.select().from(users) as Promise<User[]>
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
