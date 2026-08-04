import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/server/actions/auth'
import { db, examQuestions, exams, subjects } from '@/lib/db'
import { eq, and, asc, desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  await requireRole('admin', 'super_admin')

  const sp = req.nextUrl.searchParams
  const subjectId = sp.get('subject') || ''
  const year = sp.get('year') || ''
  const examNum = sp.get('exam') || ''
  const limit = Math.min(parseInt(sp.get('limit') || '20'), 50)
  const offset = parseInt(sp.get('offset') || '0')

  const conditions: ReturnType<typeof eq>[] = []
  if (subjectId) conditions.push(eq(examQuestions.subjectId, subjectId))
  if (year) conditions.push(eq(exams.year, parseInt(year)))
  if (examNum) conditions.push(eq(exams.examNumber, parseInt(examNum)))

  const questions = await db
    .select({
      id: examQuestions.id,
      number: examQuestions.number,
      statement: examQuestions.statement,
      correctAnswer: examQuestions.correctAnswer,
      examNumber: exams.examNumber,
      examYear: exams.year,
      subjectName: subjects.name,
      subjectColor: subjects.color,
    })
    .from(examQuestions)
    .innerJoin(exams, eq(examQuestions.examId, exams.id))
    .leftJoin(subjects, eq(examQuestions.subjectId, subjects.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(exams.examNumber), asc(examQuestions.number))
    .limit(limit)
    .offset(offset)

  return NextResponse.json({ questions })
}
