'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
  Trash2, Eye, Plus, Sparkles, Pencil, Download,
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  AlignLeft, Code2, Link2, Undo2, Redo2,
} from 'lucide-react'
import { createApostila, deleteApostila, getApostilaContent, updateApostila } from '@/server/actions/apostilas'
import type { ApostilaListItem } from '@/server/actions/apostilas'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

// ─── Apostila shared CSS ──────────────────────────────────────────────────────

const APOSTILA_CSS = `
  *{box-sizing:border-box}
  .apostila-body{font-family:Georgia,serif;color:#111;line-height:1.75;font-size:15px}
  .apostila-body h1{font-size:22px;color:#1a3a5c;border-bottom:3px solid #1a56db;padding-bottom:10px;margin-bottom:24px}
  .apostila-body h2{font-size:17px;color:#1a3a5c;margin-top:36px;margin-bottom:10px;padding-left:12px;border-left:4px solid #1a56db}
  .apostila-body h3{font-size:15px;color:#2d4a6e;margin-top:20px;margin-bottom:8px}
  .apostila-body h4{font-size:14px;color:#2d4a6e;margin-top:16px;margin-bottom:6px}
  .apostila-body p{margin:10px 0;text-align:justify}
  .apostila-body ul,.apostila-body ol{padding-left:24px;margin:10px 0}
  .apostila-body li{margin:5px 0}
  .apostila-body strong{color:#1a3a5c;font-weight:700}
  .apostila-body em{color:#555;font-style:italic}
  .apostila-body blockquote{border-left:3px solid #93c5fd;padding:10px 16px;margin:14px 0;background:#eff6ff;color:#1e40af;border-radius:0 6px 6px 0}
  .apostila-body table{width:100%;border-collapse:collapse;margin:16px 0;font-size:14px}
  .apostila-body th{background:#1a3a5c;color:#fff;padding:8px 12px;text-align:left;font-weight:600}
  .apostila-body td{padding:7px 12px;border:1px solid #dbeafe}
  .apostila-body tr:nth-child(even) td{background:#f0f7ff}
  .apostila-body hr{border:none;border-top:1px solid #e2e8f0;margin:24px 0}
`

// ─── PDF generation ───────────────────────────────────────────────────────────

function openApostilaPrintWindow(title: string, html: string) {
  const win = window.open('', '_blank')
  if (!win) { toast.error('Permita popups para gerar o PDF'); return }
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  ${APOSTILA_CSS.replace(/\.apostila-body/g, 'body')}
  body{max-width:800px;margin:40px auto;padding:20px}
  @media print{body{margin:20px;max-width:none}}
</style>
</head>
<body>
<h1>${title}</h1>
${html}
<script>window.onload=function(){window.print()}<\/script>
</body>
</html>`)
  win.document.close()
}

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
          className="apostila-body"
          dangerouslySetInnerHTML={{ __html: `<style>${APOSTILA_CSS}</style>${html}` }}
        />
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────

type EditorMode = 'visual' | 'html'

function ToolbarBtn({
  onClick, title, children, active,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${active ? 'bg-gray-200 text-blue-700' : 'text-gray-600'}`}
    >
      {children}
    </button>
  )
}

function EditApostilaDialog({
  apostila, open, onClose, onSaved,
}: {
  apostila: ApostilaListItem
  open: boolean
  onClose: () => void
  onSaved: (newTitle: string) => void
}) {
  const [editTitle, setEditTitle] = useState(apostila.title)
  const [mode, setMode] = useState<EditorMode>('visual')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  // htmlRef holds the canonical HTML string; the contenteditable div owns it while in visual mode
  const htmlRef = useRef('')
  const loadedRef = useRef(false)

  // Load content on open. Editor div is always mounted (never inside a conditional),
  // so editorRef.current is guaranteed to exist when the fetch resolves.
  useEffect(() => {
    if (!open) {
      // Reset so re-opening always fetches fresh content
      loadedRef.current = false
      htmlRef.current = ''
      if (editorRef.current) editorRef.current.innerHTML = ''
      return
    }
    if (loadedRef.current) return
    loadedRef.current = true
    setLoading(true)
    getApostilaContent(apostila.id).then(content => {
      if (content) {
        setEditTitle(content.title)
        htmlRef.current = content.contentHtml
        if (editorRef.current) {
          editorRef.current.innerHTML = content.contentHtml
        }
      }
      setLoading(false)
    })
  }, [open, apostila.id])

  const exec = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value ?? undefined)
    editorRef.current?.focus()
  }, [])

  function switchToHtml() {
    // Snapshot innerHTML before hiding the editor
    if (editorRef.current) htmlRef.current = editorRef.current.innerHTML
    setMode('html')
  }

  function switchToVisual() {
    // Restore innerHTML from the textarea's current value
    setMode('visual')
    // innerHTML will be set after the div becomes visible via useEffect
  }

  // After switching back to visual, push htmlRef into the DOM
  useEffect(() => {
    if (mode === 'visual' && editorRef.current && htmlRef.current) {
      editorRef.current.innerHTML = htmlRef.current
    }
  }, [mode])

  async function handleSave() {
    const html = mode === 'visual' && editorRef.current
      ? editorRef.current.innerHTML
      : htmlRef.current

    setSaving(true)
    const res = await updateApostila(apostila.id, { title: editTitle, contentHtml: html })
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
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex-shrink-0">
          <DialogTitle className="text-base">Editar Apostila</DialogTitle>
        </DialogHeader>

        {/* Everything stays mounted so editorRef is always available when content loads */}
        <div className="flex flex-col flex-1 overflow-hidden p-6 gap-4" style={{ display: loading ? 'none' : 'flex' }}>
          {/* Title */}
          <div className="space-y-1 flex-shrink-0">
            <Label htmlFor="editTitle" className="text-sm font-medium">Título</Label>
            <Input
              id="editTitle"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
            />
          </div>

          {/* Toolbar + mode toggle */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {mode === 'visual' && (
              <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-1 flex-wrap">
                <ToolbarBtn onClick={() => exec('bold')} title="Negrito (Ctrl+B)">
                  <Bold className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => exec('italic')} title="Itálico (Ctrl+I)">
                  <Italic className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <div className="w-px h-5 bg-gray-300 mx-1" />
                <ToolbarBtn onClick={() => exec('formatBlock', 'h2')} title="Título H2">
                  <Heading2 className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => exec('formatBlock', 'h3')} title="Subtítulo H3">
                  <Heading3 className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => exec('formatBlock', 'p')} title="Parágrafo normal">
                  <AlignLeft className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <div className="w-px h-5 bg-gray-300 mx-1" />
                <ToolbarBtn onClick={() => exec('insertUnorderedList')} title="Lista com marcadores">
                  <List className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => exec('insertOrderedList')} title="Lista numerada">
                  <ListOrdered className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <div className="w-px h-5 bg-gray-300 mx-1" />
                <ToolbarBtn onClick={() => exec('undo')} title="Desfazer">
                  <Undo2 className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => exec('redo')} title="Refazer">
                  <Redo2 className="w-3.5 h-3.5" />
                </ToolbarBtn>
              </div>
            )}

            <div className="ml-auto flex gap-1 bg-gray-100 p-1 rounded-lg flex-shrink-0">
              <button
                type="button"
                onClick={switchToVisual}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                  mode === 'visual' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <AlignLeft className="w-3 h-3" /> Visual
              </button>
              <button
                type="button"
                onClick={switchToHtml}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                  mode === 'html' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Code2 className="w-3 h-3" /> HTML
              </button>
            </div>
          </div>

          {/* Editor area — relative container so absolute children fill it exactly */}
          <div className="flex-1 min-h-0 rounded-lg border relative" style={{ minHeight: '420px' }}>
            <style dangerouslySetInnerHTML={{ __html: APOSTILA_CSS }} />

            {/* Visual WYSIWYG — absolute inset-0 gives it a concrete height so overflow-y-auto scrolls */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="apostila-body absolute inset-0 overflow-y-auto p-6 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200"
              style={{ display: mode === 'visual' ? 'block' : 'none' }}
            />

            {/* HTML source */}
            {mode === 'html' && (
              <textarea
                defaultValue={htmlRef.current}
                onChange={e => { htmlRef.current = e.target.value }}
                className="absolute inset-0 resize-none p-4 font-mono text-xs text-gray-700 focus:outline-none"
                spellCheck={false}
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

        {/* Loading overlay — separate from editor so editor stays mounted */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
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
  const [pdfLoading, setPdfLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await deleteApostila(apostila.id)
    if ('error' in res) toast.error(res.error)
    else { toast.success('Apostila excluída'); onDelete() }
    setDeleting(false)
  }

  async function handlePDF() {
    setPdfLoading(true)
    const content = await getApostilaContent(apostila.id)
    setPdfLoading(false)
    if (!content) { toast.error('Não foi possível carregar a apostila'); return }
    openApostilaPrintWindow(content.title, content.contentHtml)
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
          <Button variant="outline" size="sm" onClick={handlePDF} disabled={pdfLoading}>
            {pdfLoading
              ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              : <Download className="w-4 h-4 mr-1" />}
            PDF
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
