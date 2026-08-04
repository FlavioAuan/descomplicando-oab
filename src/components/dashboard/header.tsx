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
import { Bell, LogOut, User as UserIcon, ChevronDown, Menu } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  user: User
  onMenuClick?: () => void
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  student: 'Aluno',
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      {/* Left: hamburger */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="w-8 h-8 text-gray-500 hover:text-gray-800"
        aria-label="Abrir/fechar menu"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative w-8 h-8 text-gray-500 hover:text-gray-800"
        >
          <Bell className="w-4 h-4" />
        </Button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-auto py-1.5 px-2 hover:bg-gray-50 rounded-lg"
            >
              <Avatar className="w-7 h-7">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback
                  className="text-xs font-bold text-gray-900"
                  style={{ backgroundColor: '#C9A22740', color: '#8a6a10' }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden md:block">
                <div className="text-sm font-semibold text-gray-800 leading-tight">
                  {user.name.split(' ')[0]}
                </div>
                <div className="text-xs text-gray-400 leading-tight">
                  {ROLE_LABELS[user.role]}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <div className="font-semibold text-gray-900 text-sm">{user.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{user.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/student/profile"
                className="flex items-center gap-2 cursor-pointer"
              >
                <UserIcon className="w-4 h-4" />
                Meu perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 cursor-pointer"
              onClick={() => logout()}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair da conta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
