export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/server/actions/auth'
import { classifyBatch } from '@/lib/ai/classify'
import { questionsRepository } from '@/server/repositories/questions'
import { db, subjects, subsubjects, microtopics } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin', 'super_admin')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { limit = 20 } = await req.json().catch(() => ({}))
    const unclassified = await questionsRepository.findUnclassified(limit)

    if (unclassified.length === 0) {
      return NextResponse.json({ message: 'All questions are classified', classified: 0 })
    }

    const results = await classifyBatch(
      unclassified.map(q => ({
        id: q.id,
        statement: q.statement,
        alternatives: q.alternatives,
      }))
    )

    let classified = 0
    const allSubjects = await db.select().from(subjects)

    for (const result of results) {
      const { id, classification } = result

      // Find or create subject
      let subject = allSubjects.find(
        s => s.name.toLowerCase() === classification.discipline.toLowerCase()
      )

      if (!subject) {
        const [newSubject] = await db
          .insert(subjects)
          .values({ name: classification.discipline })
          .onConflictDoNothing()
          .returning()
        subject = newSubject
      }

      if (!subject) continue

      // Find or create subsubject
      const existingSubsubjects = await db
        .select()
        .from(subsubjects)
        .where(eq(subsubjects.subjectId, subject.id))

      let subsubject = existingSubsubjects.find(
        s => s.name.toLowerCase() === classification.subtheme.toLowerCase()
      )

      if (!subsubject) {
        const [newSub] = await db
          .insert(subsubjects)
          .values({
            subjectId: subject.id,
            name: classification.subtheme,
          })
          .onConflictDoNothing()
          .returning()
        subsubject = newSub
      }

      if (!subsubject) continue

      // Find or create microtopic
      const existingMicros = await db
        .select()
        .from(microtopics)
        .where(eq(microtopics.subsubjectId, subsubject.id))

      let microtopic = existingMicros.find(
        m => m.name.toLowerCase() === classification.microtheme.toLowerCase()
      )

      if (!microtopic) {
        const [newMicro] = await db
          .insert(microtopics)
          .values({
            subsubjectId: subsubject.id,
            name: classification.microtheme,
          })
          .onConflictDoNothing()
          .returning()
        microtopic = newMicro
      }

      if (!microtopic) continue

      await questionsRepository.updateClassification(id, {
        subjectId: subject.id,
        subsubjectId: subsubject.id,
        microtopicId: microtopic.id,
      })

      classified++
    }

    return NextResponse.json({
      classified,
      total: unclassified.length,
      message: `Classified ${classified} of ${unclassified.length} questions`,
    })
  } catch (error) {
    console.error('Classification error:', error)
    return NextResponse.json({ error: 'Classification failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const [total, classified] = await Promise.all([
      questionsRepository.countTotal(),
      questionsRepository.countClassified(),
    ])

    return NextResponse.json({
      total,
      classified,
      unclassified: total - classified,
      rate: total > 0 ? (classified / total) * 100 : 0,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 })
  }
}
