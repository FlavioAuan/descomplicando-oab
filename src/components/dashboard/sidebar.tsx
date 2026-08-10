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
  Zap,
  Trophy,
  ClipboardList,
  MessageSquare,
  BookMarked,
  AlertCircle,
  Scale,
  X,
  HelpCircle,
} from 'lucide-react'

interface SidebarProps {
  user: User
  isOpen: boolean
  onToggle: () => void
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
  { href: '/admin/questions', icon: HelpCircle, label: 'Questões' },
  { href: '/admin/simulations', icon: ClipboardList, label: 'Simulados' },
  { href: '/admin/materials', icon: BookOpen, label: 'Materiais' },
  { href: '/admin/statistics', icon: BarChart3, label: 'Estatísticas' },
  { href: '/admin/users', icon: Users, label: 'Alunos' },
  { href: '/super-admin/settings', icon: Settings, label: 'Configurações IA' },
]

const superAdminLinks = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/super-admin/classify', icon: Zap, label: 'Classificação IA' },
  { href: '/super-admin/predictions', icon: Brain, label: 'Previsões' },
  { href: '/admin/trainings', icon: GraduationCap, label: 'Treinamentos' },
  { href: '/admin/exams', icon: FileText, label: 'Provas' },
  { href: '/admin/questions', icon: HelpCircle, label: 'Questões' },
  { href: '/admin/simulations', icon: ClipboardList, label: 'Simulados' },
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

export function Sidebar({ user, isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const links = getLinks(user.role)

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col w-64 transition-all duration-300 ease-in-out',
        'md:relative md:inset-auto md:z-auto md:flex-shrink-0',
        isOpen
          ? 'translate-x-0 md:w-64'
          : '-translate-x-full md:translate-x-0 md:w-16'
      )}
      style={{ backgroundColor: '#111827' }}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 min-w-0',
            !isOpen && 'md:justify-center'
          )}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#C9A227' }}
          >
            <Scale className="w-5 h-5 text-gray-900" />
          </div>
          <div className={cn('min-w-0', !isOpen && 'md:hidden')}>
            <div className="text-white font-bold text-sm leading-tight truncate">
              DescomplicandOAB
            </div>
            <div className="text-xs leading-tight truncate" style={{ color: '#C9A227' }}>
              Treinamento para a OAB
            </div>
          </div>
        </Link>

        {/* Close button — mobile only */}
        <button
          onClick={onToggle}
          className="md:hidden flex-shrink-0 p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Fechar menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Section label */}
      <div className={cn('px-5 pt-5 pb-2 flex-shrink-0', !isOpen && 'md:hidden')}>
        <span
          className="text-xs font-semibold tracking-widest"
          style={{ color: '#6B7280' }}
        >
          {ROLE_SECTION[user.role] ?? 'NAVEGAÇÃO'}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 pb-4 space-y-0.5 overflow-y-auto">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== '/dashboard' && pathname.startsWith(link.href))

          return (
            <Link
              key={link.href}
              href={link.href}
              title={!isOpen ? link.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                !isOpen && 'md:justify-center md:px-2',
                isActive
                  ? 'text-gray-900 shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/8'
              )}
              style={
                isActive ? { backgroundColor: '#C9A227', color: '#111827' } : {}
              }
            >
              <link.icon
                className="w-4 h-4 flex-shrink-0"
                style={isActive ? { color: '#111827' } : {}}
              />
              <span className={cn(!isOpen && 'md:hidden')}>{link.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div
        className={cn(
          'px-4 py-4 border-t border-white/10 flex-shrink-0',
          !isOpen && 'md:flex md:justify-center md:px-2'
        )}
      >
        {user.role === 'student' && isOpen && (
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

        <div
          className={cn(
            'flex items-center gap-2',
            !isOpen && 'md:justify-center'
          )}
          title={!isOpen ? `${user.name} — ${user.email}` : undefined}
        >
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
          <div className={cn('flex-1 min-w-0', !isOpen && 'md:hidden')}>
            <div className="text-xs font-medium text-white truncate">{user.name}</div>
            <div className="text-xs text-gray-500 truncate">{user.email}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
