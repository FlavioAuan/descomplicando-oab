'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from './auth'
import { db, apostilas, subjects } from '@/lib/db'
import { desc, isNull, eq } from 'drizzle-orm'
import { generateApostila } from '@/lib/ai/generate'

// ─── Text extraction ──────────────────────────────────────────────────────────

async function extractFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  const buffer = Buffer.from(await file.arrayBuffer())

  if (name.endsWith('.pdf')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('pdf-parse')
    const pdfParse = mod.default ?? mod
    const result = await pdfParse(buffer)
    return (result.text as string) || ''
  }

  if (name.endsWith('.docx')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return (result.value as string) || ''
  }

  // txt, md, html etc.
  return buffer.toString('utf-8')
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createApostila(formData: FormData): Promise<
  { data: { id: string; title: string; contentHtml: string } } | { error: string }
> {
  await requireRole('admin', 'super_admin')

  const title = (formData.get('title') as string)?.trim()
  const discipline = (formData.get('discipline') as string)?.trim() || ''
  const subtheme = (formData.get('subtheme') as string)?.trim() || ''
  const files = formData.getAll('files') as File[]

  if (!title) return { error: 'Título da apostila é obrigatório.' }

  // Extract text from each uploaded file (cap per file to save context)
  let ragContext = ''
  for (const file of files) {
    if (!file || file.size === 0) continue
    try {
      const text = await extractFileText(file)
      ragContext += `\n\n=== ${file.name} ===\n${text.substring(0, 6000)}`
    } catch {
      // skip unreadable files silently
    }
  }

  // Find subject ID if discipline was provided
  const allSubjects = await db.select({ id: subjects.id, name: subjects.name }).from(subjects)
  const subjectMatch = discipline
    ? allSubjects.find(s => s.name.toLowerCase() === discipline.toLowerCase())
    : undefined

  // Generate via AI
  const content = await generateApostila({
    subject: discipline || title,
    subtheme: subtheme || '',
    microtheme: title,
    ragContext: ragContext || undefined,
  })

  const [saved] = await db
    .insert(apostilas)
    .values({
      title,
      contentHtml: content.htmlContent,
      subjectId: subjectMatch?.id ?? null,
      generatedBy: 'ai',
    })
    .returning()

  revalidatePath('/admin/materials')
  return { data: { id: saved.id, title: saved.title, contentHtml: saved.contentHtml } }
}

export async function deleteApostila(id: string): Promise<{ success: true } | { error: string }> {
  await requireRole('admin', 'super_admin')
  await db.delete(apostilas).where(eq(apostilas.id, id))
  revalidatePath('/admin/materials')
  return { success: true }
}

export type ApostilaListItem = {
  id: string
  title: string
  generatedAt: Date
  subjectName: string | null
}

export async function getApostilaContent(id: string): Promise<{ title: string; contentHtml: string } | null> {
  const { apostilas } = await import('@/lib/db/schema')
  const rows = await db.select({ title: apostilas.title, contentHtml: apostilas.contentHtml })
    .from(apostilas).where(eq(apostilas.id, id)).limit(1)
  return rows[0] ?? null
}

export async function listStandaloneApostilas(): Promise<ApostilaListItem[]> {
  return db
    .select({
      id: apostilas.id,
      title: apostilas.title,
      generatedAt: apostilas.generatedAt,
      subjectName: subjects.name,
    })
    .from(apostilas)
    .leftJoin(subjects, eq(apostilas.subjectId, subjects.id))
    .where(isNull(apostilas.trainingTopicId))
    .orderBy(desc(apostilas.generatedAt)) as Promise<ApostilaListItem[]>
}
