import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/server/actions/auth'
import { db, examQuestions } from '@/lib/db'
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
  }

  if (!id) {
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.statement !== undefined) updates.statement = body.statement.trim()
  if (body.alternatives !== undefined) updates.alternatives = body.alternatives
  if (body.correctAnswer !== undefined) updates.correctAnswer = body.correctAnswer.toLowerCase()

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const [updated] = await updateReturning(examQuestions, updates, eq(examQuestions.id, id))

  if (!updated) {
    return NextResponse.json({ error: 'Questão não encontrada' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
