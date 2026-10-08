'use server'

import { existsSync } from 'fs'
import { eq, like } from 'drizzle-orm'
import type { MySqlColumn, MySqlTable } from 'drizzle-orm/mysql-core'
import { requireRole } from './auth'
import { db, systemSettings, exams, knowledgeFiles, apostilas, certificates, videos, users } from '@/lib/db'
import { resolveStoragePath, saveFile } from '@/lib/storage'

// After the Supabase → MySQL data migration, file URLs point to /api/files/...
// but the files themselves still live in Supabase Storage. This copies them
// into the storage volume.

const FILE_COLUMNS: Array<[MySqlTable, MySqlColumn]> = [
  [exams, exams.pdfUrl],
  [exams, exams.gabaritoUrl],
  [knowledgeFiles, knowledgeFiles.url],
  [apostilas, apostilas.pdfUrl],
  [certificates, certificates.pdfUrl],
  [videos, videos.url],
  [videos, videos.thumbnailUrl],
  [users, users.avatarUrl],
]

const PREFIX = '/api/files/'

async function getLegacyBaseUrl(): Promise<string | null> {
  const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'legacy_storage_url')).limit(1)
  return row?.value || null
}

async function listReferencedFiles(): Promise<string[]> {
  const found = new Set<string>()
  for (const [table, column] of FILE_COLUMNS) {
    const rows = await db.select({ url: column }).from(table).where(like(column, `${PREFIX}%`))
    for (const r of rows) if (typeof r.url === 'string') found.add(r.url.slice(PREFIX.length))
  }
  return [...found]
}

function diskPath(relative: string) {
  const segments = relative.split('/').map((s) => decodeURIComponent(s))
  return { segments, full: resolveStoragePath(...segments) }
}

export async function getLegacyFilesStatus() {
  await requireRole('super_admin')
  const baseUrl = await getLegacyBaseUrl()
  if (!baseUrl) return { enabled: false, total: 0, missing: 0 }

  const files = await listReferencedFiles()
  const missing = files.filter((f) => {
    const { full } = diskPath(f)
    return full !== null && !existsSync(full)
  }).length
  return { enabled: true, total: files.length, missing }
}

export async function importLegacyFiles() {
  await requireRole('super_admin')
  const baseUrl = await getLegacyBaseUrl()
  if (!baseUrl) return { error: 'Endereço do Supabase não encontrado.' }

  const files = await listReferencedFiles()
  let downloaded = 0
  const failed: string[] = []

  const queue = files.filter((f) => {
    const { full } = diskPath(f)
    return full !== null && !existsSync(full)
  })

  async function worker() {
    for (let f = queue.shift(); f !== undefined; f = queue.shift()) {
      try {
        const res = await fetch(baseUrl + f)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { segments } = diskPath(f)
        await saveFile(segments[0], segments.slice(1).join('/'), Buffer.from(await res.arrayBuffer()))
        downloaded++
      } catch (err) {
        failed.push(`${decodeURIComponent(f)} (${(err as Error).message})`)
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))

  return { total: files.length, downloaded, failed }
}
