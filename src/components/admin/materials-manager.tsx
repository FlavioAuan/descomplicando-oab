'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileText, BookOpen, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

interface KnowledgeFile {
  id: string
  name: string
  originalName: string
  fileType: string
  url: string
  sizeBytes: number | null
  subjectId: string | null
  version: number
  processedAt: Date | null
  createdAt: Date
}

interface MaterialsManagerProps {
  files: KnowledgeFile[]
  subjects: Array<{ id: string; name: string }>
}

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: '📄',
  docx: '📝',
  txt: '📃',
  epub: '📚',
  pptx: '📊',
}

export function MaterialsManager({ files: initialFiles, subjects }: MaterialsManagerProps) {
  const [files, setFiles] = useState(initialFiles)
  const [uploading, setUploading] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [documentName, setDocumentName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!documentName.trim()) {
      toast.error('Informe um nome para o documento')
      return
    }

    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', documentName)
    if (selectedSubject) formData.append('subjectId', selectedSubject)

    try {
      const response = await fetch('/api/rag/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success(`Documento indexado! ${data.chunkCount} trechos processados.`)
        window.location.reload()
      }
    } catch {
      toast.error('Erro ao fazer upload')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="w-5 h-5" />
            Upload de Material
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do documento</Label>
              <Input
                placeholder="Ex: Código Civil 2024"
                value={documentName}
                onChange={e => setDocumentName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Disciplina relacionada</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as disciplinas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Geral (sem disciplina específica)</SelectItem>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-500">Processando e indexando...</p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 font-medium">Clique para selecionar arquivo</p>
                <p className="text-sm text-gray-400 mt-1">PDF, DOCX, TXT, EPUB, PPTX</p>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt,.epub,.pptx"
            onChange={handleUpload}
            disabled={uploading}
          />
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-5 h-5" />
            Base Jurídica ({files.length} documentos)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              Nenhum documento indexado ainda
            </p>
          ) : (
            <div className="space-y-2">
              {files.map(file => {
                const subject = subjects.find(s => s.id === file.subjectId)
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-2xl">
                      {FILE_TYPE_ICONS[file.fileType] || '📄'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{file.name}</p>
                      <p className="text-xs text-gray-400">
                        {file.fileType.toUpperCase()} ·{' '}
                        {file.sizeBytes ? `${(file.sizeBytes / 1024).toFixed(1)} KB` : '-'} ·{' '}
                        v{file.version} · {formatDate(file.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {subject && (
                        <Badge variant="outline" className="text-xs">{subject.name}</Badge>
                      )}
                      {file.processedAt ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
