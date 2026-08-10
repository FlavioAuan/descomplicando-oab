'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Upload, X, FileText, Loader2, BookOpen,
  Trash2, Eye, Plus, Sparkles, Pencil,
} from 'lucide-react'
import { createApostila, deleteApostila, getApostilaContent, updateApostila } from '@/server/actions/apostilas'
import type { ApostilaListItem } from '@/server/actions/apostilas'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

// ─── File chip ────────────────────────────────────────────────────────────────

function FileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 text-xs text-blue-700">
      <FileText className="w-3 h-3 flex-shrink-0" />
      <span className="truncate max-w-[160px]">{file.name}</span>
      <button type="button" onClick={onRemove} className="ml-0.5 hover:text-red-500">
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

// ─── Apostila viewer dialog ───────────────────────────────────────────────────

function ApostilaViewer({
  title, html, open, onClose,
}: { title: string; html: string; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────

function EditApostilaDialog({
  apostila, open, onClose, onSaved,
}: {
  apostila: ApostilaListItem
  open: boolean
  onClose: () => void
  onSaved: (newTitle: string) => void
}) {
  const [editTitle, setEditTitle] = useState(apostila.title)
  const [editHtml, setEditHtml] = useState('')
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load content when dialog opens
  async function handleOpen(isOpen: boolean) {
    if (!isOpen) { onClose(); return }
    if (editHtml) return // already loaded
    setLoading(true)
    const content = await getApostilaContent(apostila.id)
    if (content) {
      setEditTitle(content.title)
      setEditHtml(content.contentHtml)
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const res = await updateApostila(apostila.id, { title: editTitle, contentHtml: editHtml })
    if ('error' in res) {
      toast.error(res.error)
    } else {
      toast.success('Apostila atualizada')
      onSaved(editTitle)
      onClose()
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex-shrink-0">
          <DialogTitle className="text-base">Editar Apostila</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden p-6 gap-4">
            {/* Title */}
            <div className="space-y-1 flex-shrink-0">
              <Label htmlFor="editTitle" className="text-sm font-medium">Título</Label>
              <Input
                id="editTitle"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
              />
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit flex-shrink-0">
              {(['edit', 'preview'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t === 'edit' ? 'Editar HTML' : 'Visualizar'}
                </button>
              ))}
            </div>

            {/* Editor / Preview */}
            <div className="flex-1 overflow-hidden rounded-lg border min-h-0">
              {tab === 'edit' ? (
                <textarea
                  value={editHtml}
                  onChange={e => setEditHtml(e.target.value)}
                  className="w-full h-full resize-none p-4 font-mono text-xs text-gray-700 focus:outline-none"
                  spellCheck={false}
                  style={{ minHeight: '400px' }}
                />
              ) : (
                <div
                  className="w-full h-full overflow-y-auto p-6 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: editHtml }}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 flex-shrink-0">
              <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar alterações
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Apostila card ────────────────────────────────────────────────────────────

function ApostilaCard({
  apostila, onView, onDelete, onTitleChange,
}: {
  apostila: ApostilaListItem
  onView: () => void
  onDelete: () => void
  onTitleChange: (newTitle: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await deleteApostila(apostila.id)
    if ('error' in res) toast.error(res.error)
    else { toast.success('Apostila excluída'); onDelete() }
    setDeleting(false)
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
        <div className="flex items-start gap-3 min-w-0">
          <BookOpen className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{apostila.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDate(apostila.generatedAt)}
              {apostila.subjectName && (
                <> · <span className="text-blue-600">{apostila.subjectName}</span></>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onView}>
            <Eye className="w-4 h-4 mr-1" /> Ver
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="w-4 h-4 mr-1" /> Editar
          </Button>
          <Button
            variant="ghost" size="icon"
            className="text-red-400 hover:text-red-600 hover:bg-red-50"
            onClick={handleDelete} disabled={deleting}
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <EditApostilaDialog
        apostila={apostila}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={onTitleChange}
      />
    </>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  initialApostilas: ApostilaListItem[]
  subjects: { id: string; name: string }[]
}

export function ApostilasPanel({ initialApostilas, subjects }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [subtheme, setSubtheme] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [generating, setGenerating] = useState(false)

  // Result
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewTitle, setPreviewTitle] = useState('')
  const [viewerOpen, setViewerOpen] = useState(false)

  // List
  const [apostilasList, setApostilasList] = useState(initialApostilas)

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return
    const accepted = Array.from(newFiles).filter(f =>
      /\.(pdf|docx?|txt|md)$/i.test(f.name)
    )
    setFiles(prev => [...prev, ...accepted])
  }

  async function handleCreate() {
    if (!title.trim()) { toast.error('Informe o título da apostila'); return }

    setGenerating(true)
    const fd = new FormData()
    fd.append('title', title.trim())
    fd.append('discipline', discipline)
    fd.append('subtheme', subtheme)
    files.forEach(f => fd.append('files', f))

    const result = await createApostila(fd)
    setGenerating(false)

    if ('error' in result) {
      toast.error(result.error)
      return
    }

    toast.success('Apostila criada com sucesso!')
    setPreviewHtml(result.data.contentHtml)
    setPreviewTitle(result.data.title)
    setViewerOpen(true)

    // Reset form
    setTitle(''); setDiscipline(''); setSubtheme(''); setFiles([])
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* ── Creation form ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <h2 className="font-semibold text-gray-900">Criar Nova Apostila</h2>
        </div>

        <div className="space-y-1">
          <Label htmlFor="title">Título da Apostila <span className="text-red-500">*</span></Label>
          <Input
            id="title"
            placeholder="Ex: Contratos no Direito Civil — Formação e Extinção"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <p className="text-xs text-gray-400">
            Seja específico. O título guia toda a geração do conteúdo.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="discipline">Disciplina (opcional)</Label>
            <select
              id="discipline"
              value={discipline}
              onChange={e => setDiscipline(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">— Detectar pelo título —</option>
              {subjects.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="subtheme">Subtema (opcional)</Label>
            <Input
              id="subtheme"
              placeholder="Ex: Contratos em espécie"
              value={subtheme}
              onChange={e => setSubtheme(e.target.value)}
            />
          </div>
        </div>

        {/* File upload */}
        <div className="space-y-2">
          <Label>Documentos de referência (opcional)</Label>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
            className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-5 cursor-pointer transition-colors text-center bg-gray-50"
          >
            <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
            <p className="text-sm text-gray-500">
              Arraste ou clique para enviar PDFs, DOCXs ou TXTs
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Esses arquivos serão usados como contexto para a IA
            </p>
            <input
              ref={fileRef} type="file" multiple
              accept=".pdf,.doc,.docx,.txt,.md"
              className="hidden"
              onChange={e => addFiles(e.target.files)}
            />
          </div>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <FileChip
                  key={i} file={f}
                  onRemove={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={handleCreate}
          disabled={generating || !title.trim()}
          className="w-full"
          size="lg"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando apostila com IA…</>
            : <><Plus className="w-4 h-4 mr-2" /> Criar Apostila</>}
        </Button>
      </div>

      {/* ── List ──────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Apostilas criadas
            {apostilasList.length > 0 && (
              <Badge className="ml-2 bg-gray-100 text-gray-600">{apostilasList.length}</Badge>
            )}
          </h2>
        </div>

        {apostilasList.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center">
            <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhuma apostila criada ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {apostilasList.map(a => (
              <ApostilaCard
                key={a.id}
                apostila={a}
                onView={async () => {
                  const content = await getApostilaContent(a.id)
                  if (content) {
                    setPreviewTitle(content.title)
                    setPreviewHtml(content.contentHtml)
                    setViewerOpen(true)
                  }
                }}
                onDelete={() => {
                  setApostilasList(prev => prev.filter(x => x.id !== a.id))
                  router.refresh()
                }}
                onTitleChange={newTitle => {
                  setApostilasList(prev =>
                    prev.map(x => x.id === a.id ? { ...x, title: newTitle } : x)
                  )
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Viewer dialog */}
      <ApostilaViewer
        title={previewTitle}
        html={previewHtml}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  )
}
