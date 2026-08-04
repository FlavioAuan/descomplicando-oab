import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/server/actions/auth'
import {
  db,
  simulations,
  simulationQuestions,
  examQuestions,
  statistics,
} from '@/lib/db'
import { eq, and, isNull, sql } from 'drizzle-orm'

// Largest-remainder proportional distribution
function distributeByHistory(
  stats: { subjectId: string; percentage: number }[],
  total: number
): Map<string, number> {
  const totalPct = stats.reduce((a, s) => a + s.percentage, 0)
  if (totalPct === 0) return new Map()

  const raw = stats.map((s) => ({
    id: s.subjectId,
    raw: (s.percentage / totalPct) * total,
  }))

  const floors = raw.map((s) => Math.floor(s.raw))
  const floorSum = floors.reduce((a, b) => a + b, 0)
  const remainder = total - floorSum

  const sorted = raw
    .map((s, i) => ({ ...s, frac: s.raw - floors[i], floor: floors[i] }))
    .sort((a, b) => b.frac - a.frac)

  const result = new Map<string, number>()
  sorted.forEach((s, i) => {
    result.set(s.id, s.floor + (i < remainder ? 1 : 0))
  })
  return result
}

export async function POST(req: NextRequest) {
  const user = await requireRole('admin', 'super_admin')
  const body = await req.json()

  const { name, type, timeLimitMinutes, totalQuestions, mode, distribution, questionIds } =
    body as {
      name: string
      type: string
      timeLimitMinutes: number
      totalQuestions: number
      mode: 'historico' | 'disciplinas' | 'manual'
      distribution?: Record<string, number>
      questionIds?: string[]
    }

  if (!name?.trim() || !type || !totalQuestions) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  let selectedIds: string[] = []

  if (mode === 'manual') {
    selectedIds = questionIds ?? []
  } else if (mode === 'historico') {
    const statsRows = await db
      .select({
        subjectId: statistics.subjectId,
        percentage: statistics.percentageHistorical,
      })
      .from(statistics)
      .where(
        and(
          isNull(statistics.subsubjectId),
          isNull(statistics.microtopicId),
          sql`${statistics.subjectId} IS NOT NULL`,
          sql`${statistics.percentageHistorical} > 0`
        )
      )

    const valid = statsRows
      .filter((s) => s.subjectId && s.percentage)
      .map((s) => ({ subjectId: s.subjectId!, percentage: s.percentage! }))

    const dist = distributeByHistory(valid, totalQuestions)

    for (const [subjectId, count] of dist.entries()) {
      if (count <= 0) continue
      const qs = await db
        .select({ id: examQuestions.id })
        .from(examQuestions)
        .where(eq(examQuestions.subjectId, subjectId))
        .orderBy(sql`RANDOM()`)
        .limit(count)
      selectedIds.push(...qs.map((q) => q.id))
    }
  } else if (mode === 'disciplinas') {
    for (const [subjectId, count] of Object.entries(distribution ?? {})) {
      if (!count || count <= 0) continue
      const qs = await db
        .select({ id: examQuestions.id })
        .from(examQuestions)
        .where(eq(examQuestions.subjectId, subjectId))
        .orderBy(sql`RANDOM()`)
        .limit(count)
      selectedIds.push(...qs.map((q) => q.id))
    }
  }

  if (selectedIds.length === 0) {
    return NextResponse.json({ error: 'Nenhuma questão selecionada' }, { status: 400 })
  }

  // Shuffle when mixing sources
  if (mode !== 'manual') {
    for (let i = selectedIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[selectedIds[i], selectedIds[j]] = [selectedIds[j], selectedIds[i]]
    }
  }

  const [sim] = await db
    .insert(simulations)
    .values({
      name: name.trim(),
      type: type as 'general' | 'subject' | 'topic' | 'predicted' | 'adaptive',
      timeLimitMinutes: timeLimitMinutes ?? 300,
      totalQuestions: selectedIds.length,
      isAdaptive: type === 'adaptive',
      createdBy: user.id,
    })
    .returning()

  await db.insert(simulationQuestions).values(
    selectedIds.map((qId, i) => ({
      simulationId: sim.id,
      questionId: qId,
      order: i + 1,
    }))
  )

  return NextResponse.json({ simulation: sim })
}

export async function DELETE(req: NextRequest) {
  await requireRole('admin', 'super_admin')
  const { id } = (await req.json()) as { id: string }
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  await db.delete(simulations).where(eq(simulations.id, id))
  return NextResponse.json({ ok: true })
}
