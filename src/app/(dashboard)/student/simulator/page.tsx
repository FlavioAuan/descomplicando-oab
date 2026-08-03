import { Metadata } from 'next'
import { requireUser } from '@/server/actions/auth'
import { db, simulations, subjects, studentSimulations } from '@/lib/db'
import { eq, desc, and } from 'drizzle-orm'
import { SimulatorList } from '@/components/student/simulator-list'

export const metadata: Metadata = { title: 'Simulados' }

export default async function SimulatorPage() {
  const user = await requireUser()

  const [availableSimulations, completedSimulations, allSubjects] = await Promise.all([
    db.select().from(simulations).orderBy(desc(simulations.createdAt)),
    db
      .select()
      .from(studentSimulations)
      .where(eq(studentSimulations.userId, user.id))
      .orderBy(desc(studentSimulations.startedAt))
      .limit(10),
    db.select({ id: subjects.id, name: subjects.name }).from(subjects),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Simulados</h1>
        <p className="text-gray-500 mt-1">
          Pratique com simulados no formato oficial da OAB
        </p>
      </div>

      <SimulatorList
        simulations={availableSimulations}
        completed={completedSimulations}
        subjects={allSubjects}
        userId={user.id}
      />
    </div>
  )
}
