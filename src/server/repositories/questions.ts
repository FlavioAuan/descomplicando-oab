import { eq, and, sql, isNull, desc, asc } from 'drizzle-orm'
import { BaseRepository } from './base'
import { examQuestions, exams, subjects, subsubjects } from '@/lib/db/schema'
import type { ExamQuestion, Difficulty } from '@/types'

export class QuestionsRepository extends BaseRepository {
  async findById(id: string): Promise<ExamQuestion | null> {
    const result = await this.db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.id, id))
      .limit(1)

    return (result[0] as ExamQuestion) || null
  }

  async findByExam(examId: string): Promise<ExamQuestion[]> {
    return this.db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.examId, examId))
      .orderBy(asc(examQuestions.number)) as Promise<ExamQuestion[]>
  }

  async findUnclassified(limit = 50): Promise<ExamQuestion[]> {
    return this.db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.classified, false))
      .limit(limit) as Promise<ExamQuestion[]>
  }

  async findBySubject(
    subjectId: string,
    options?: {
      difficulty?: Difficulty
      limit?: number
      offset?: number
    }
  ): Promise<ExamQuestion[]> {
    const conditions = [eq(examQuestions.subjectId, subjectId)]
    if (options?.difficulty) {
      conditions.push(eq(examQuestions.difficulty, options.difficulty))
    }

    return this.db
      .select()
      .from(examQuestions)
      .where(and(...conditions))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0) as Promise<ExamQuestion[]>
  }

  async findForSimulation(params: {
    subjectId?: string
    subsubjectId?: string
    count: number
    excludeIds?: string[]
  }): Promise<ExamQuestion[]> {
    const conditions = [sql`length(${examQuestions.alternatives}->>'a') > 5`]
    if (params.subjectId) conditions.push(eq(examQuestions.subjectId, params.subjectId))
    if (params.subsubjectId) conditions.push(eq(examQuestions.subsubjectId, params.subsubjectId))

    return this.db
      .select()
      .from(examQuestions)
      .where(and(...conditions))
      .orderBy(sql`RANDOM()`)
      .limit(params.count) as Promise<ExamQuestion[]>
  }

  async updateClassification(
    id: string,
    data: {
      subjectId: string
      subsubjectId: string
      microtopicId: string
      difficulty?: Difficulty
    }
  ): Promise<void> {
    await this.db
      .update(examQuestions)
      .set({
        subjectId: data.subjectId,
        subsubjectId: data.subsubjectId,
        microtopicId: data.microtopicId,
        difficulty: data.difficulty || 'medium',
        classified: true,
        classifiedAt: new Date(),
      })
      .where(eq(examQuestions.id, id))
  }

  async countTotal(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(examQuestions)

    return result[0]?.count || 0
  }

  async countClassified(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(examQuestions)
      .where(eq(examQuestions.classified, true))

    return result[0]?.count || 0
  }

  async getSubjectDistribution(): Promise<Array<{
    subjectId: string
    subjectName: string
    count: number
    percentage: number
  }>> {
    const total = await this.countTotal()

    const result = await this.db
      .select({
        subjectId: subjects.id,
        subjectName: subjects.name,
        count: sql<number>`count(${examQuestions.id})::int`,
      })
      .from(examQuestions)
      .leftJoin(subjects, eq(examQuestions.subjectId, subjects.id))
      .where(sql`${examQuestions.subjectId} IS NOT NULL`)
      .groupBy(subjects.id, subjects.name)
      .orderBy(desc(sql`count(${examQuestions.id})`))

    return result.map(r => ({
      subjectId: r.subjectId || '',
      subjectName: r.subjectName || 'Unknown',
      count: r.count,
      percentage: total > 0 ? r.count / total : 0,
    }))
  }

  async insertMany(
    questions: Array<{
      examId: string
      number: number
      statement: string
      alternatives: { a: string; b: string; c: string; d: string }
      correctAnswer: string
    }>
  ): Promise<void> {
    if (questions.length === 0) return

    await this.db.insert(examQuestions).values(
      questions.map(q => ({
        examId: q.examId,
        number: q.number,
        statement: q.statement,
        alternatives: q.alternatives,
        correctAnswer: q.correctAnswer,
      }))
    )
  }
}

export const questionsRepository = new QuestionsRepository()
