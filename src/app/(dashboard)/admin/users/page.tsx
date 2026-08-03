import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { db, users } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { UsersTable } from '@/components/admin/users-table'

export const metadata: Metadata = { title: 'Usuários' }

export default async function UsersPage() {
  await requireRole('admin', 'super_admin')

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      xp: users.xp,
      level: users.level,
      streak: users.streak,
      lastActiveAt: users.lastActiveAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        <p className="text-gray-500 mt-1">
          Gerencie os usuários da plataforma
        </p>
      </div>

      <UsersTable users={allUsers} />
    </div>
  )
}
