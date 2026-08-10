'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from './auth'
import { db, flashcardSets, flashcardSetCards, apostilas } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { generateFlashcardSet } from '@/lib/ai/generate'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FlashcardSetItem = {
  id: string
  title: string
  apostilaTitle: string | null
  cardCount: number
  createdAt: Date
}

export type FlashcardCard = {
  id: string
  order: number
  front: string
  back: string
  difficulty: string
}

// ─── Admin Actions ────────────────────────────────────────────────────────────

export async function listFlashcardSets(): Promise<FlashcardSetItem[]> {
  await requireRole('admin', 'super_admin')
  const rows = await db
    .select({
      id: flashcardSets.id,
      title: flashcardSets.title,
      apostilaTitle: apostilas.title,
      cardCount: flashcardSets.cardCount,
      createdAt: flashcardSets.createdAt,
    })
    .from(flashcardSets)
    .leftJoin(apostilas, eq(flashcardSets.apostilaId, apostilas.id))
    .orderBy(desc(flashcardSets.createdAt))
  return rows as FlashcardSetItem[]
}

export async function createFlashcardSet(formData: FormData): Promise<
  { data: { id: string; title: string; cardCount: number } } | { error: string }
> {
  await requireRole('admin', 'super_admin')

  const title = (formData.get('title') as string)?.trim()
  const apostilaId = (formData.get('apostilaId') as string) || null
  const countRaw = parseInt(formData.get('count') as string) || 15

  if (!title) return { error: 'Título é obrigatório.' }
  if (!apostilaId) return { error: 'Selecione uma apostila como base.' }

  const [apostila] = await db.select().from(apostilas).where(eq(apostilas.id, apostilaId)).limit(1)
  if (!apostila) return { error: 'Apostila não encontrada.' }

  const cards = await generateFlashcardSet({
    title,
    apostilaContent: apostila.contentHtml,
    count: Math.min(countRaw, 30),
  })

  if (!cards.length) return { error: 'A IA não gerou flashcards. Tente novamente.' }

  const [set] = await db.insert(flashcardSets).values({
    title,
    apostilaId,
    cardCount: cards.length,
  }).returning()

  await db.insert(flashcardSetCards).values(
    cards.map((c, i) => ({
      setId: set.id,
      order: i + 1,
      front: c.front,
      back: c.back,
      difficulty: c.difficulty ?? 'medium',
    }))
  )

  revalidatePath('/admin/flashcards')
  return { data: { id: set.id, title: set.title, cardCount: set.cardCount } }
}

export async function deleteFlashcardSet(id: string): Promise<{ success: true } | { error: string }> {
  await requireRole('admin', 'super_admin')
  await db.delete(flashcardSets).where(eq(flashcardSets.id, id))
  revalidatePath('/admin/flashcards')
  return { success: true }
}

export async function getFlashcardSetWithCards(id: string): Promise<{
  set: { id: string; title: string }
  cards: FlashcardCard[]
} | null> {
  const rows = await db.select().from(flashcardSets).where(eq(flashcardSets.id, id)).limit(1)
  if (!rows[0]) return null

  const cards = await db
    .select()
    .from(flashcardSetCards)
    .where(eq(flashcardSetCards.setId, id))
    .orderBy(flashcardSetCards.order)

  return { set: { id: rows[0].id, title: rows[0].title }, cards: cards as FlashcardCard[] }
}
