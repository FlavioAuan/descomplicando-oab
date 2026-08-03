import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/server/actions/auth'
import { generatePredictions } from '@/lib/ai/generate'
import { getTopicFrequency } from '@/server/services/statistics'
import { db, predictions, exams } from '@/lib/db'
import { sql, desc } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin', 'super_admin')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const topicFrequency = await getTopicFrequency()

    const totalExamsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(exams)
    const examCount = totalExamsResult[0]?.count || 0

    const statisticsData = topicFrequency.map(t => ({
      topic: `${t.subsubjectName} (${t.subjectName})`,
      subject: t.subjectName,
      totalQuestions: t.totalQuestions,
      presenceInExams: t.presenceInExams,
      totalExams: t.totalExams,
      frequencyRecent: t.frequencyRecent,
      trend: t.trend,
    }))

    const generatedPredictions = await generatePredictions({
      statisticsData: statisticsData.slice(0, 100),
      examCount,
    })

    // Save predictions to database
    const lastExam = await db
      .select({ examNumber: exams.examNumber })
      .from(exams)
      .orderBy(desc(exams.examNumber))
      .limit(1)

    const nextExamNumber = (lastExam[0]?.examNumber || 0) + 1

    for (const pred of generatedPredictions) {
      await db.insert(predictions).values({
        rank: pred.rank,
        probability: pred.probability,
        frequencyHistorical: pred.frequencyHistorical,
        frequencyRecent: pred.frequencyRecent,
        trend: pred.trend as any,
        justification: pred.justification,
        generatedForExam: nextExamNumber,
      })
    }

    return NextResponse.json({
      predictions: generatedPredictions,
      generatedFor: `${nextExamNumber}º Exame`,
    })
  } catch (error) {
    console.error('Predictions error:', error)
    return NextResponse.json({ error: 'Failed to generate predictions' }, { status: 500 })
  }
}

export async function GET() {
  const latestPredictions = await db
    .select()
    .from(predictions)
    .orderBy(desc(predictions.generatedAt), predictions.rank)
    .limit(50)

  return NextResponse.json({ predictions: latestPredictions })
}
