import { and, asc, eq } from 'drizzle-orm'
import { db, orders, trainingDays, trainingTopics } from '@/lib/db'

// Who can open which lessons:
// - the first FREE_DAYS days of every training are free for everyone;
// - buying a training unlocks all of its days;
// - the lifetime plan unlocks every day of every training (and every ebook);
// - an ebook opens when it was bought, or when its linked training was bought;
// - admins see everything.

export type Access = {
  full: boolean            // admin or lifetime plan
  lifetime: boolean
  trainingIds: Set<string> // trainings bought individually
  ebookIds: Set<string>    // ebooks bought individually
}

export async function getAccess(user: { id: string; role: string }): Promise<Access> {
  const rows = await db
    .select({ kind: orders.kind, trainingId: orders.trainingId, ebookId: orders.ebookId })
    .from(orders)
    .where(and(eq(orders.userId, user.id), eq(orders.status, 'approved')))

  const lifetime = rows.some(r => r.kind === 'lifetime')
  const isAdmin = user.role === 'admin' || user.role === 'super_admin'
  return {
    full: isAdmin || lifetime,
    lifetime,
    trainingIds: new Set(rows.flatMap(r => (r.kind === 'training' && r.trainingId ? [r.trainingId] : []))),
    ebookIds: new Set(rows.flatMap(r => (r.kind === 'ebook' && r.ebookId ? [r.ebookId] : []))),
  }
}

export function ownsEbook(access: Access, ebook: { id: string; trainingId: string | null }) {
  return access.full || access.ebookIds.has(ebook.id) || Boolean(ebook.trainingId && access.trainingIds.has(ebook.trainingId))
}

export function ownsTraining(access: Access, trainingId: string) {
  return access.full || access.trainingIds.has(trainingId)
}

/** How many lessons (days) at the start of each training anyone can open. */
export const FREE_DAYS = 2

/** The day numbers that are free, given all day numbers of a training. */
export function freeDayNumbers(dayNumbers: number[]) {
  return new Set([...dayNumbers].sort((a, b) => a - b).slice(0, FREE_DAYS))
}

export function canOpenDay(access: Access, trainingId: string, dayNumber: number, freeDays: Set<number>) {
  return freeDays.has(dayNumber) || ownsTraining(access, trainingId)
}

/** Whether the user may open/complete a given topic (checked server-side on every write). */
export async function canOpenTopic(user: { id: string; role: string }, topicId: string) {
  const [topic] = await db
    .select({ trainingId: trainingDays.trainingId, dayNumber: trainingDays.dayNumber })
    .from(trainingTopics)
    .innerJoin(trainingDays, eq(trainingDays.id, trainingTopics.trainingDayId))
    .where(eq(trainingTopics.id, topicId))
    .limit(1)
  if (!topic) return false

  const days = await db
    .select({ dayNumber: trainingDays.dayNumber })
    .from(trainingDays)
    .where(eq(trainingDays.trainingId, topic.trainingId))
    .orderBy(asc(trainingDays.dayNumber))
    .limit(FREE_DAYS)

  const freeDays = freeDayNumbers(days.map(d => d.dayNumber))
  return canOpenDay(await getAccess(user), topic.trainingId, topic.dayNumber, freeDays)
}
