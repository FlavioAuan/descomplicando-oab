import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { db, subjects, statistics, exams, examQuestions } from '@/lib/db'
import { eq, and, isNull, sql, desc } from 'drizzle-orm'
import { SimulationCreateForm } from '@/components/admin/simulation-create-form'

export const metadata: Metadata = { title: 'Criar Simulado' }

export default async function NewSimulationPage() {
  await requireRole('admin', 'super_admin')

  const [subjectsRows, statsRows, examsRows] = await Promise.all([
    db
      .select({ id: subjects.id, name: subjects.name, color: subjects.color })
      .from(subjects)
      .orderBy(subjects.name),

    db
      .select({
        subjectId: statistics.subjectId,
        percentage: statistics.percentageHistorical,
        totalQuestions: statistics.totalQuestions,
        avgPerExam: statistics.avgPerExam,
        trend: statistics.trend,
      })
      .from(statistics)
      .where(
        and(isNull(statistics.subsubjectId), isNull(statistics.microtopicId))
      ),

    db
      .select({ examNumber: exams.examNumber, year: exams.year })
      .from(exams)
      .orderBy(desc(exams.examNumber)),
  ])

  // Count available questions per subject
  const qCountRows = await db
    .select({
      subjectId: examQuestions.subjectId,
      count: sql<number>`count(*)::int`,
    })
    .from(examQuestions)
    .where(sql`${examQuestions.subjectId} IS NOT NULL`)
    .groupBy(examQuestions.subjectId)

  const qCountMap = new Map(qCountRows.map((r) => [r.subjectId, r.count]))
  const statsMap = new Map(statsRows.map((s) => [s.subjectId, s]))

  const subjectsWithData = subjectsRows.map((s) => ({
    ...s,
    percentage: statsMap.get(s.id)?.percentage ?? 0,
    totalQuestions: statsMap.get(s.id)?.totalQuestions ?? 0,
    avgPerExam: statsMap.get(s.id)?.avgPerExam ?? 0,
    trend: statsMap.get(s.id)?.trend ?? 'stable',
    availableCount: qCountMap.get(s.id) ?? 0,
  }))

  return (
    <SimulationCreateForm
      subjects={subjectsWithData}
      exams={examsRows}
    />
  )
}
