export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/server/actions/auth'
import { processDocument } from '@/lib/ai/rag'
import { db, knowledgeFiles } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { saveFile } from '@/lib/storage'
import { insertReturning } from '@/lib/db/helpers'

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin', 'super_admin')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await (await import('@/server/actions/auth')).requireUser()

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const subjectId = formData.get('subjectId') as string | null
    const name = formData.get('name') as string

    if (!file) {
      return NextResponse.json({ error: 'File required' }, { status: 400 })
    }

    const allowedTypes = ['application/pdf', 'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/epub+zip']

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'File type not supported' }, { status: 400 })
    }

    // Save to the storage volume
    const storagePath = `knowledge/${Date.now()}-${file.name.replace(/[\/]/g, '_')}`

    const buffer = await file.arrayBuffer()
    let fileUrl: string
    try {
      fileUrl = await saveFile('materials', storagePath, buffer)
    } catch (uploadError) {
      return NextResponse.json({ error: 'Upload failed: ' + (uploadError as Error).message }, { status: 500 })
    }

    // Create knowledge file record
    const fileTypeMap: Record<string, string> = {
      'application/pdf': 'pdf',
      'text/plain': 'txt',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/epub+zip': 'epub',
    }

    const [knowledgeFile] = await insertReturning(knowledgeFiles, {
      name: name || file.name,
      originalName: file.name,
      fileType: (fileTypeMap[file.type] || 'txt') as any,
      url: fileUrl,
      sizeBytes: file.size,
      subjectId: subjectId || null,
      uploadedBy: user.id,
    })

    // Extract text and process
    let text = ''

    if (file.type === 'text/plain') {
      text = await file.text()
    } else if (file.type === 'application/pdf') {
      // In production, use pdf-parse
      text = `[PDF Content - ${file.name}]\nProcessamento de PDF seria feito aqui com pdf-parse.`
    } else {
      text = `[Document Content - ${file.name}]\nProcessamento de documento seria feito aqui.`
    }

    const chunkCount = await processDocument({
      fileId: knowledgeFile.id,
      content: text,
      subjectId: subjectId || undefined,
    })

    // Mark as processed
    await db
      .update(knowledgeFiles)
      .set({ processedAt: new Date() })
      .where(eq(knowledgeFiles.id, knowledgeFile.id))

    return NextResponse.json({
      fileId: knowledgeFile.id,
      name: knowledgeFile.name,
      chunkCount,
      url: fileUrl,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
