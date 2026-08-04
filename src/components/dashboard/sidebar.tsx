'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { User } from '@/types'
import {
  LayoutDashboard,
  BookOpen,
  Brain,
  BarChart3,
  FileText,
  GraduationCap,
  Users,
  Settings,
  Upload,
  Zap,
  Trophy,
  ClipboardList,
  MessageSquare,
  BookMarked,
  AlertCircle,
  Scale,
} from 'lucide-react'

interface SidebarProps {
  user: User
}

const studentLinks = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/student/training', icon: GraduationCap, label: 'Meu Treinamento' },
  { href: '/student/simulator', icon: ClipboardList, label: 'Simulados' },
  { href: '/student/flashcards', icon: Brain, label: 'Flashcards' },
  { href: '/student/tutor', icon: MessageSquare, label: 'Tutor IA' },
  { href: '/student/errors', icon: AlertCircle, label: 'Caderno de Erros' },
  { href: '/student/certificates', icon: Trophy, label: 'Certificados' },
]

const adminLinks = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/trainings', icon: GraduationCap, label: 'Treinamentos' },
  { href: '/admin/exams', icon: FileText, label: 'Provas' },
  { href: '/admin/materials', icon: BookOpen, label: 'Materiais' },
  { href: '/admin/statistics', icon: BarChart3, label: 'Estatísticas' },
  { href: '/admin/users', icon: Users, label: 'Alunos' },
]

const superAdminLinks = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/super-admin/import', icon: Upload, label: 'Importação Histórica' },
  { href: '/super-admin/classify', icon: Zap, label: 'Classificação IA' },
  { href: '/super-admin/predictions', icon: Brain, label: 'Previsões' },
  { href: '/admin/trainings', icon: GraduationCap, label: 'Treinamentos' },
  { href: '/admin/exams', icon: FileText, label: 'Provas' },
  { href: '/admin/materials', icon: BookMarked, label: 'Materiais' },
  { href: '/admin/users', icon: Users, label: 'Usuários' },
  { href: '/super-admin/settings', icon: Settings, label: 'Configurações' },
]

const ROLE_SECTION: Record<string, string> = {
  student: 'ÁREA DO ALUNO',
  admin: 'PAINEL ADMIN',
  super_admin: 'SUPER ADMIN',
}

function getLinks(role: string) {
  if (role === 'super_admin') return superAdminLinks
  if (role === 'admin') return adminLinks
  return studentLinks
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const links = getLinks(user.role)

  return (
    <aside className="w-64 flex flex-col" style={{ backgroundColor: '#111827' }}>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#C9A227' }}
          >
            <Scale className="w-5 h-5 text-gray-900" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">DescomplicandOAB</div>
            <div className="text-xs leading-tight" style={{ color: '#C9A227' }}>
              Treinamento para a OAB
            </div>
          </div>
        </Link>
      </div>

      {/* Section Label */}
      <div className="px-5 pt-5 pb-2">
        <span className="text-xs font-semibold tracking-widest" style={{ color: '#6B7280' }}>
          {ROLE_SECTION[user.role] ?? 'NAVEGAÇÃO'}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== '/dashboard' && pathname.startsWith(link.href))

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'text-gray-900 shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/8'
              )}
              style={
                isActive
                  ? { backgroundColor: '#C9A227', color: '#111827' }
                  : {}
              }
            >
              <link.icon
                className="w-4 h-4 flex-shrink-0"
                style={isActive ? { color: '#111827' } : {}}
              />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* User info at bottom */}
      <div className="px-4 py-4 border-t border-white/10">
        {user.role === 'student' && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Nível {user.level}</span>
              <span className="text-xs font-medium" style={{ color: '#C9A227' }}>
                {user.xp} XP
              </span>
            </div>
            <div className="h-1 rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  backgroundColor: '#C9A227',
                  width: `${Math.min(((user.xp % 500) / 500) * 100, 100)}%`,
                }}
              />
            </div>
            {user.streak > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-orange-400">
                <span>🔥</span>
                <span>{user.streak} dias seguidos</span>
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-gray-900 flex-shrink-0"
            style={{ backgroundColor: '#C9A227' }}
          >
            {user.name
              .split(' ')
              .slice(0, 2)
              .map((n) => n[0])
              .join('')
              .toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">{user.name}</div>
            <div className="text-xs text-gray-500 truncate">{user.email}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
