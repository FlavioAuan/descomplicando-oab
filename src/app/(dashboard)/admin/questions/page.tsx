import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { db, examQuestions, exams, subjects, subsubjects } from '@/lib/db'
import { eq, and, asc, desc, sql } from 'drizzle-orm'
import { QuestionsView } from '@/components/admin/questions-view'

export const metadata: Metadata = { title: 'Questões das Provas' }

const PAGE_SIZE = 30

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    subject?: string
    year?: string
    exam?: string
    question?: string
    page?: string
  }>
}) {
  await requireRole('admin', 'super_admin')

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1'))
  const subjectFilter = params.subject || ''
  const yearFilter = params.year || ''
  const examFilter = params.exam || ''
  const questionFilter = params.question || ''

  const conditions: ReturnType<typeof eq>[] = []
  if (subjectFilter) conditions.push(eq(examQuestions.subjectId, subjectFilter))
  if (yearFilter) conditions.push(eq(exams.year, parseInt(yearFilter)))
  if (examFilter) conditions.push(eq(exams.examNumber, parseInt(examFilter)))
  if (questionFilter) conditions.push(eq(examQuestions.number, parseInt(questionFilter)))

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [allSubjects, allExams, countResult, questions] = await Promise.all([
    db
      .select({ id: subjects.id, name: subjects.name, color: subjects.color })
      .from(subjects)
      .orderBy(subjects.name),

    db
      .select({ examNumber: exams.examNumber, year: exams.year })
      .from(exams)
      .orderBy(desc(exams.examNumber)),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(examQuestions)
      .innerJoin(exams, eq(examQuestions.examId, exams.id))
      .where(whereClause),

    db
      .select({
        id: examQuestions.id,
        number: examQuestions.number,
        statement: examQuestions.statement,
        alternatives: examQuestions.alternatives,
        correctAnswer: examQuestions.correctAnswer,
        classified: examQuestions.classified,
        examNumber: exams.examNumber,
        examYear: exams.year,
        subjectId: examQuestions.subjectId,
        subjectName: subjects.name,
        subjectColor: subjects.color,
        subsubjectName: subsubjects.name,
      })
      .from(examQuestions)
      .innerJoin(exams, eq(examQuestions.examId, exams.id))
      .leftJoin(subjects, eq(examQuestions.subjectId, subjects.id))
      .leftJoin(subsubjects, eq(examQuestions.subsubjectId, subsubjects.id))
      .where(whereClause)
      .orderBy(desc(exams.examNumber), asc(examQuestions.number))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
  ])

  return (
    <QuestionsView
      questions={questions}
      subjects={allSubjects}
      exams={allExams}
      total={countResult[0]?.count ?? 0}
      page={page}
      pageSize={PAGE_SIZE}
      filters={{
        subject: subjectFilter,
        year: yearFilter,
        exam: examFilter,
        question: questionFilter,
      }}
    />
  )
}
