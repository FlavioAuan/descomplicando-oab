'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDate } from '@/lib/utils'
import type { Role } from '@/types'

interface UserRow {
  id: string
  name: string
  email: string
  role: Role
  xp: number
  level: number
  streak: number
  lastActiveAt: Date | null
  createdAt: Date
}

interface UsersTableProps {
  users: UserRow[]
}

const ROLE_BADGES: Record<Role, { label: string; class: string }> = {
  super_admin: { label: 'Super Admin', class: 'bg-purple-100 text-purple-700' },
  admin: { label: 'Admin', class: 'bg-blue-100 text-blue-700' },
  student: { label: 'Aluno', class: 'bg-gray-100 text-gray-700' },
}

export function UsersTable({ users }: UsersTableProps) {
  const students = users.filter(u => u.role === 'student')
  const admins = users.filter(u => u.role !== 'student')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-800">{users.length}</div>
            <div className="text-sm text-gray-500">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{students.length}</div>
            <div className="text-sm text-gray-500">Alunos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{admins.length}</div>
            <div className="text-sm text-gray-500">Admins</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-2 pr-4">Usuário</th>
                  <th className="text-left py-2 pr-4">Perfil</th>
                  <th className="text-right py-2 pr-4">Nível</th>
                  <th className="text-right py-2 pr-4">XP</th>
                  <th className="text-right py-2 pr-4">Sequência</th>
                  <th className="text-left py-2">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const roleBadge = ROLE_BADGES[user.role]
                  const initials = user.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

                  return (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="bg-blue-600 text-white text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-800">{user.name}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={roleBadge.class}>{roleBadge.label}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-right font-medium">{user.level}</td>
                      <td className="py-3 pr-4 text-right text-gray-600">{user.xp}</td>
                      <td className="py-3 pr-4 text-right">
                        {user.streak > 0 && (
                          <span className="text-orange-500">🔥 {user.streak}</span>
                        )}
                      </td>
                      <td className="py-3 text-gray-400">{formatDate(user.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
