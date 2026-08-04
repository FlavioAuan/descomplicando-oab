import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { getDashboardStats } from '@/server/services/statistics'
import { db, users, trainings } from '@/lib/db'
import { sql, eq } from 'drizzle-orm'
import { StatCard } from '@/components/dashboard/stat-card'
import { SubjectChart } from '@/components/admin/subject-chart'
import { TrendingTopics } from '@/components/admin/trending-topics'
import { RecentActivity } from '@/components/admin/recent-activity'
import { FileText, Users, GraduationCap, CheckSquare } from 'lucide-react'

export const metadata: Metadata = { title: 'Dashboard Admin' }

export default async function AdminDashboardPage() {
  await requireRole('admin', 'super_admin')

  const [stats, totalStudents, totalTrainings] = await Promise.all([
    getDashboardStats(),
    db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.role, 'student')),
    db.select({ count: sql<number>`count(*)::int` }).from(trainings),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Administrativo</h1>
        <p className="text-gray-500 mt-1">Visão geral da plataforma</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Provas"
          value={stats.totalExams}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Questões Cadastradas"
          value={stats.totalQuestions}
          icon={CheckSquare}
          color="green"
          description={`${(stats.classificationRate * 100).toFixed(0)}% classificadas`}
        />
        <StatCard
          title="Alunos Ativos"
          value={totalStudents[0]?.count || 0}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Treinamentos"
          value={totalTrainings[0]?.count || 0}
          icon={GraduationCap}
          color="orange"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubjectChart data={stats.topSubjects} />
        <TrendingTopics subjects={stats.topSubjects} />
      </div>

      <RecentActivity />
    </div>
  )
}
