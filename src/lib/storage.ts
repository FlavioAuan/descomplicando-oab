import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

// Files live on disk (an Easypanel volume in production) and are served by
// /api/files/[...path]. STORAGE_DIR must be the volume's mount path.

export const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './storage')

/** Resolves bucket/key inside STORAGE_DIR, rejecting anything that escapes it. */
export function resolveStoragePath(...segments: string[]): string | null {
  const full = path.resolve(STORAGE_DIR, ...segments)
  return full.startsWith(STORAGE_DIR + path.sep) ? full : null
}

export function publicFileUrl(bucket: string, key: string): string {
  return `/api/files/${[bucket, ...key.split('/')].map(encodeURIComponent).join('/')}`
}

export async function saveFile(bucket: string, key: string, data: Buffer | ArrayBuffer): Promise<string> {
  const full = resolveStoragePath(bucket, key)
  if (!full) throw new Error(`Invalid storage path: ${bucket}/${key}`)

  await mkdir(path.dirname(full), { recursive: true })
  await writeFile(full, Buffer.isBuffer(data) ? data : new Uint8Array(data))
  return publicFileUrl(bucket, key)
}
