import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { db, simulations, subjects } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { SimulationsList } from '@/components/admin/simulations-list'

export const metadata: Metadata = { title: 'Gerenciar Simulados' }

export default async function AdminSimulationsPage() {
  await requireRole('admin', 'super_admin')

  const rows = await db
    .select({
      id: simulations.id,
      name: simulations.name,
      type: simulations.type,
      totalQuestions: simulations.totalQuestions,
      timeLimitMinutes: simulations.timeLimitMinutes,
      isAdaptive: simulations.isAdaptive,
      createdAt: simulations.createdAt,
      subjectName: subjects.name,
    })
    .from(simulations)
    .leftJoin(subjects, eq(simulations.subjectId, subjects.id))
    .orderBy(desc(simulations.createdAt))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Simulados</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {rows.length} simulado{rows.length !== 1 ? 's' : ''} criado{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/simulations/new">
            <Plus className="w-4 h-4 mr-2" />
            Criar Simulado
          </Link>
        </Button>
      </div>

      <SimulationsList simulations={rows} />
    </div>
  )
}
