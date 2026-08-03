'use client'

import { logout } from '@/server/actions/auth'
import type { User } from '@/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Bell, LogOut, User as UserIcon, Settings } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  user: User
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  student: 'Aluno',
}

export function Header({ user }: HeaderProps) {
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6">
      <div />

      <div className="flex items-center gap-3">
        {/* Notifications placeholder */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-auto p-1">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="bg-blue-600 text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden md:block">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.name}
                </div>
                <div className="text-xs text-gray-500">{ROLE_LABELS[user.role]}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/student/profile" className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => logout()}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
