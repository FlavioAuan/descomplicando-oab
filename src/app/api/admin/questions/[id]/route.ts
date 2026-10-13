import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/server/actions/auth'
import { db, examQuestions, subsubjects, microtopics } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { updateReturning } from '@/lib/db/helpers'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole('admin', 'super_admin')

  const { id } = await params
  const body = await req.json() as {
    statement?: string
    alternatives?: { a: string; b: string; c: string; d: string }
    correctAnswer?: string
    // Classification: send all three together; null clears that level
    classification?: {
      subjectId: string | null
      subsubjectId: string | null
      microtopicId: string | null
    }
  }

  if (!id) {
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.statement !== undefined) updates.statement = body.statement.trim()
  if (body.alternatives !== undefined) updates.alternatives = body.alternatives
  if (body.correctAnswer !== undefined) updates.correctAnswer = body.correctAnswer.toLowerCase()

  if (body.classification !== undefined) {
    const { subjectId, subsubjectId, microtopicId } = body.classification

    // Each level must belong to the level above it
    if (subsubjectId) {
      const [sub] = await db.select({ subjectId: subsubjects.subjectId }).from(subsubjects).where(eq(subsubjects.id, subsubjectId)).limit(1)
      if (!sub || sub.subjectId !== subjectId) {
        return NextResponse.json({ error: 'Subtema não pertence à disciplina escolhida' }, { status: 400 })
      }
    }
    if (microtopicId) {
      const [micro] = await db.select({ subsubjectId: microtopics.subsubjectId }).from(microtopics).where(eq(microtopics.id, microtopicId)).limit(1)
      if (!micro || !subsubjectId || micro.subsubjectId !== subsubjectId) {
        return NextResponse.json({ error: 'Microtema não pertence ao subtema escolhido' }, { status: 400 })
      }
    }

    updates.subjectId = subjectId || null
    updates.subsubjectId = subsubjectId || null
    updates.microtopicId = microtopicId || null
    updates.classified = !!subjectId
    updates.classifiedAt = subjectId ? new Date() : null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const [updated] = await updateReturning(examQuestions, updates, eq(examQuestions.id, id))

  if (!updated) {
    return NextResponse.json({ error: 'Questão não encontrada' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
