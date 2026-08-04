export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/server/actions/auth'
import { db, simulations, simulationQuestions, examQuestions, studentSimulations } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser()
  const { id } = await params

  const simulation = await db
    .select()
    .from(simulations)
    .where(eq(simulations.id, id))
    .limit(1)

  if (!simulation[0]) {
    return NextResponse.json({ error: 'Simulation not found' }, { status: 404 })
  }

  const simQuestions = await db
    .select({
      id: examQuestions.id,
      number: examQuestions.number,
      statement: examQuestions.statement,
      alternatives: examQuestions.alternatives,
      correctAnswer: examQuestions.correctAnswer,
    })
    .from(simulationQuestions)
    .innerJoin(examQuestions, eq(simulationQuestions.questionId, examQuestions.id))
    .where(eq(simulationQuestions.simulationId, id))
    .orderBy(simulationQuestions.order)

  // Create student simulation record
  const [studentSim] = await db
    .insert(studentSimulations)
    .values({
      userId: user.id,
      simulationId: id,
    })
    .returning()

  return NextResponse.json({
    questions: simQuestions,
    studentSimulationId: studentSim.id,
  })
}
