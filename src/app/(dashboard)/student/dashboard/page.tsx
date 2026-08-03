import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { getStudentDashboard } from '@/server/actions/student'
import { StatCard } from '@/components/dashboard/stat-card'
import { StudentProgressCard } from '@/components/student/progress-card'
import { WeeklyCalendar } from '@/components/student/weekly-calendar'
import { RecentSimulations } from '@/components/student/recent-simulations'
import { db, studentTrainingProgress, trainings } from '@/lib/db'
import { eq, and, sql } from 'drizzle-orm'
import { Target, CheckSquare, AlertCircle, Flame } from 'lucide-react'
import { formatPercent } from '@/lib/utils'

export const metadata: Metadata = { title: 'Meu Painel' }

export default async function StudentDashboardPage() {
  const user = await requireRole('student', 'admin', 'super_admin')
  const dashboard = await getStudentDashboard()

  const accuracy = dashboard.accuracy

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, {user.name.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {user.streak > 0
            ? `🔥 ${user.streak} dias de sequência! Continue assim!`
            : 'Vamos estudar hoje?'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Questões Respondidas"
          value={dashboard.totalAnswered}
          icon={CheckSquare}
          color="blue"
        />
        <StatCard
          title="Taxa de Acerto"
          value={formatPercent(accuracy)}
          icon={Target}
          color={accuracy >= 0.7 ? 'green' : accuracy >= 0.5 ? 'orange' : 'red'}
        />
        <StatCard
          title="Revisões Pendentes"
          value={dashboard.nextReviews}
          icon={AlertCircle}
          color="orange"
        />
        <StatCard
          title="Sequência"
          value={`${user.streak} dias`}
          icon={Flame}
          color="red"
        />
      </div>

      {/* Progress and Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WeeklyCalendar userId={user.id} />
        </div>
        <StudentProgressCard user={user} accuracy={accuracy} />
      </div>

      {/* Recent Simulations */}
      <RecentSimulations simulations={dashboard.recentSimulations} />
    </div>
  )
}
