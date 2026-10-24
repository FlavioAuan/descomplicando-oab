import { NextResponse, type NextRequest } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { eq } from 'drizzle-orm'
import { getCurrentUser } from '@/server/actions/auth'
import { db, ebooks } from '@/lib/db'
import { resolveEbookFile } from '@/lib/storage'
import { getAccess, ownsEbook } from '@/server/services/access'

export const dynamic = 'force-dynamic'

// The only way to read an ebook PDF: checks that the user bought the ebook,
// its training or the lifetime plan. ?download=1 saves instead of opening.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const { id } = await params
  const [ebook] = await db.select().from(ebooks).where(eq(ebooks.id, id)).limit(1)
  if (!ebook) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!ownsEbook(await getAccess(user), ebook)) {
    return NextResponse.redirect(new URL(`/student/ebooks#ebook-${ebook.id}`, request.url))
  }

  const full = resolveEbookFile(ebook.filePath)
  try {
    if (!full) throw new Error('unknown file path')
    const info = await stat(full)
    const data = await readFile(full)
    const filename = `${ebook.title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-')}.pdf`
    const disposition = request.nextUrl.searchParams.get('download') ? 'attachment' : 'inline'
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(info.size),
        'Content-Disposition': `${disposition}; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    console.error('[ebooks] file missing', { id: ebook.id, filePath: ebook.filePath })
    return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
  }
}
