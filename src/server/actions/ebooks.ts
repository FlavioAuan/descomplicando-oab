'use server'

import { revalidatePath } from 'next/cache'
import { unlink } from 'fs/promises'
import { eq } from 'drizzle-orm'
import { requireRole } from './auth'
import { db, ebooks } from '@/lib/db'
import { resolveEbookFile } from '@/lib/storage'

// Creating and editing ebooks goes through POST /api/admin/ebooks (file uploads).

export async function deleteEbook(id: string) {
  await requireRole('admin', 'super_admin')
  const [ebook] = await db.select().from(ebooks).where(eq(ebooks.id, id)).limit(1)
  if (!ebook) return { error: 'Ebook não encontrado' }

  await db.delete(ebooks).where(eq(ebooks.id, id))
  // Uploaded PDFs are removed too; the ones shipped with the app (bundled:) stay
  if (ebook.filePath.startsWith('storage:')) {
    const full = resolveEbookFile(ebook.filePath)
    if (full) await unlink(full).catch(() => {})
  }

  revalidatePath('/admin/ebooks')
  revalidatePath('/student/ebooks')
  return { success: true as const }
}
