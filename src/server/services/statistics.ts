import { db } from '@/lib/db'
import { examQuestions, subjects, subsubjects, exams, statistics } from '@/lib/db/schema'
import { eq, sql, desc, and, inArray } from 'drizzle-orm'

export interface SubjectStat {
  subjectId: string
  subjectName: string
  totalQuestions: number
  percentageHistorical: number
  avgPerExam: number
  presenceInExams: number
  presencePercentage: number
  trend: 'growing' | 'stable' | 'declining'
}

export async function calculateSubjectStatistics(): Promise<SubjectStat[]> {
  const totalExamsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(exams)

  const totalExams = totalExamsResult[0]?.count || 1

  const totalQuestionsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(examQuestions)
    .where(sql`${examQuestions.subjectId} IS NOT NULL`)

  const totalQuestions = totalQuestionsResult[0]?.count || 1

  const subjectCounts = await db
    .select({
      subjectId: subjects.id,
      subjectName: subjects.name,
      totalQuestions: sql<number>`count(${examQuestions.id})::int`,
      presenceInExams: sql<number>`count(DISTINCT ${examQuestions.examId})::int`,
    })
    .from(examQuestions)
    .innerJoin(subjects, eq(examQuestions.subjectId, subjects.id))
    .groupBy(subjects.id, subjects.name)
    .orderBy(desc(sql`count(${examQuestions.id})`))

  // Calculate trend based on recent vs historical frequency
  const recentExams = await db
    .select({ id: exams.id })
    .from(exams)
    .orderBy(desc(exams.examNumber))
    .limit(5)

  const recentExamIds = recentExams.map(e => e.id)

  const recentCounts = recentExamIds.length > 0
    ? await db
        .select({
          subjectId: examQuestions.subjectId,
          recentCount: sql<number>`count(*)::int`,
        })
        .from(examQuestions)
        .where(inArray(examQuestions.examId, recentExamIds))
        .groupBy(examQuestions.subjectId)
    : []

  const recentMap = new Map(recentCounts.map(r => [r.subjectId, r.recentCount]))

  return subjectCounts.map(s => {
    const percentage = s.totalQuestions / totalQuestions
    const avgPerExam = s.totalQuestions / totalExams
    const recentCount = recentMap.get(s.subjectId) || 0
    const recentPercentage = recentCount / (recentExams.length * 80)
    const historicalPercentage = percentage

    let trend: 'growing' | 'stable' | 'declining' = 'stable'
    if (recentPercentage > historicalPercentage * 1.15) trend = 'growing'
    else if (recentPercentage < historicalPercentage * 0.85) trend = 'declining'

    return {
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      totalQuestions: s.totalQuestions,
      percentageHistorical: percentage,
      avgPerExam,
      presenceInExams: s.presenceInExams,
      presencePercentage: s.presenceInExams / totalExams,
      trend,
    }
  })
}

export async function getTopicFrequency(): Promise<Array<{
  subjectId: string
  subsubjectId: string
  subjectName: string
  subsubjectName: string
  totalQuestions: number
  presenceInExams: number
  totalExams: number
  frequencyHistorical: number
  frequencyRecent: number
  trend: 'growing' | 'stable' | 'declining'
}>> {
  const totalExamsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(exams)
  const totalExams = totalExamsResult[0]?.count || 1

  const recentExamsResult = await db
    .select({ id: exams.id })
    .from(exams)
    .orderBy(desc(exams.examNumber))
    .limit(10)
  const recentExamIds = recentExamsResult.map(e => e.id)
  const recentExamCount = recentExamsResult.length || 1

  const historicalData = await db
    .select({
      subjectId: subjects.id,
      subsubjectId: subsubjects.id,
      subjectName: subjects.name,
      subsubjectName: subsubjects.name,
      totalQuestions: sql<number>`count(${examQuestions.id})::int`,
      presenceInExams: sql<number>`count(DISTINCT ${examQuestions.examId})::int`,
    })
    .from(examQuestions)
    .innerJoin(subjects, eq(examQuestions.subjectId, subjects.id))
    .innerJoin(subsubjects, eq(examQuestions.subsubjectId, subsubjects.id))
    .groupBy(subjects.id, subsubjects.id, subjects.name, subsubjects.name)
    .orderBy(desc(sql`count(${examQuestions.id})`))
    .limit(200)

  const recentData = recentExamIds.length > 0
    ? await db
        .select({
          subsubjectId: examQuestions.subsubjectId,
          recentCount: sql<number>`count(*)::int`,
        })
        .from(examQuestions)
        .where(inArray(examQuestions.examId, recentExamIds))
        .groupBy(examQuestions.subsubjectId)
    : []

  const recentMap = new Map(recentData.map(r => [r.subsubjectId, r.recentCount]))

  return historicalData.map(d => {
    const freqHistorical = d.presenceInExams / totalExams
    const recentCount = recentMap.get(d.subsubjectId) || 0
    const freqRecent = recentCount / (recentExamCount * 80)

    let trend: 'growing' | 'stable' | 'declining' = 'stable'
    if (freqRecent > freqHistorical * 1.2) trend = 'growing'
    else if (freqRecent < freqHistorical * 0.8) trend = 'declining'

    return {
      subjectId: d.subjectId,
      subsubjectId: d.subsubjectId || '',
      subjectName: d.subjectName,
      subsubjectName: d.subsubjectName || '',
      totalQuestions: d.totalQuestions,
      presenceInExams: d.presenceInExams,
      totalExams,
      frequencyHistorical: freqHistorical,
      frequencyRecent: freqRecent,
      trend,
    }
  })
}

export async function getHotTopics(): Promise<Array<{
  name: string
  subject: string
  percentage: number
  trend: string
}>> {
  const topics = await getTopicFrequency()

  return topics
    .filter(t => t.trend === 'growing' && t.frequencyHistorical > 0.1)
    .slice(0, 20)
    .map(t => ({
      name: t.subsubjectName,
      subject: t.subjectName,
      percentage: t.frequencyRecent,
      trend: 'growing',
    }))
}

export async function getDashboardStats() {
  const [totalExamsResult, totalQuestionsResult, classifiedResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(exams),
    db.select({ count: sql<number>`count(*)::int` }).from(examQuestions),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(examQuestions)
      .where(eq(examQuestions.classified, true)),
  ])

  const totalExams = totalExamsResult[0]?.count || 0
  const totalQuestions = totalQuestionsResult[0]?.count || 0
  const classified = classifiedResult[0]?.count || 0

  const subjectStats = await calculateSubjectStatistics()

  return {
    totalExams,
    totalQuestions,
    classifiedQuestions: classified,
    classificationRate: totalQuestions > 0 ? classified / totalQuestions : 0,
    topSubjects: subjectStats.map(s => ({
      name: s.subjectName,
      count: s.totalQuestions,
      percentage: s.percentageHistorical,
      trend: s.trend,
    })),
  }
}
