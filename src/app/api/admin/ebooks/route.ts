import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getCurrentUser } from '@/server/actions/auth'
import { db, ebooks } from '@/lib/db'
import { parseBRL } from '@/lib/money'
import { saveFile, savePrivateFile } from '@/lib/storage'

export const dynamic = 'force-dynamic'

const MAX_PDF_BYTES = 150 * 1024 * 1024
const MAX_COVER_BYTES = 5 * 1024 * 1024
const COVER_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

async function countPages(buffer: Buffer) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (b: Buffer) => Promise<{ numpages: number }>
    return (await pdfParse(buffer)).numpages || null
  } catch {
    return null
  }
}

/**
 * Creates (no "id") or updates an ebook. Multipart fields: id, title, description,
 * subjectId, trainingId, price ("297,00" or empty), order, pdf (file), cover (image).
 * The PDF goes to private storage; the cover is public.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const form = await request.formData()
  const text = (name: string) => String(form.get(name) ?? '').trim()
  const id = text('id')
  const title = text('title')
  if (!title) return NextResponse.json({ error: 'Informe o título' }, { status: 400 })

  let priceCents: number | null = null
  if (text('price')) {
    priceCents = parseBRL(text('price'))
    if (!priceCents || priceCents < 100) return NextResponse.json({ error: 'Preço inválido (ex.: 49,90) ou deixe em branco' }, { status: 400 })
  }

  const [existing] = id ? await db.select().from(ebooks).where(eq(ebooks.id, id)).limit(1) : []
  if (id && !existing) return NextResponse.json({ error: 'Ebook não encontrado' }, { status: 404 })
  const ebookId = existing?.id ?? crypto.randomUUID()

  const values: Partial<typeof ebooks.$inferInsert> = {
    title,
    description: text('description') || null,
    subjectId: text('subjectId') || null,
    trainingId: text('trainingId') || null,
    priceCents,
    order: Number(text('order')) || 0,
  }

  const pdf = form.get('pdf')
  if (pdf instanceof File && pdf.size > 0) {
    const buffer = Buffer.from(await pdf.arrayBuffer())
    if (buffer.subarray(0, 5).toString() !== '%PDF-') return NextResponse.json({ error: 'O arquivo do ebook precisa ser um PDF' }, { status: 400 })
    if (buffer.length > MAX_PDF_BYTES) return NextResponse.json({ error: 'PDF maior que 150 MB' }, { status: 400 })
    // A new name per upload, so a replaced file never serves stale content
    values.filePath = await savePrivateFile(`ebooks/${ebookId}/${Date.now()}.pdf`, buffer)
    values.sizeBytes = buffer.length
    values.pageCount = await countPages(buffer)
  } else if (!existing) {
    return NextResponse.json({ error: 'Envie o PDF do ebook' }, { status: 400 })
  }

  const cover = form.get('cover')
  if (cover instanceof File && cover.size > 0) {
    const ext = COVER_TYPES[cover.type]
    if (!ext) return NextResponse.json({ error: 'A capa deve ser JPG, PNG ou WEBP' }, { status: 400 })
    if (cover.size > MAX_COVER_BYTES) return NextResponse.json({ error: 'Capa maior que 5 MB' }, { status: 400 })
    values.coverUrl = await saveFile('ebook-covers', `${ebookId}-${Date.now()}.${ext}`, await cover.arrayBuffer())
  }

  if (existing) {
    await db.update(ebooks).set(values).where(eq(ebooks.id, ebookId))
  } else {
    await db.insert(ebooks).values({ ...values, id: ebookId, title, filePath: values.filePath! })
  }

  revalidatePath('/admin/ebooks')
  revalidatePath('/student/ebooks')
  return NextResponse.json({ id: ebookId })
}
