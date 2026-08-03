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

function getLinks(role: string) {
  if (role === 'super_admin') return superAdminLinks
  if (role === 'admin') return adminLinks
  return studentLinks
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const links = getLinks(user.role)

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            ⚖
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-sm">
            DescomplicandOAB
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href ||
            (link.href !== '/dashboard' && pathname.startsWith(link.href))

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              )}
            >
              <link.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-blue-600' : '')} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* User XP Bar */}
      {user.role === 'student' && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user.level}
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Nível {user.level}
              </div>
              <div className="text-xs text-gray-500">{user.xp} XP</div>
            </div>
          </div>
          {user.streak > 0 && (
            <div className="flex items-center gap-1 text-xs text-orange-500">
              <span>🔥</span>
              <span>{user.streak} dias seguidos</span>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
