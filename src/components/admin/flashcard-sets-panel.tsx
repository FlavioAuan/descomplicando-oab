'use client'

import { useState, useEffect, useRef } from 'react'
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
import { Loader2, Plus, Sparkles, Trash2, Brain, Eye, Pencil, Download } from 'lucide-react'
import {
  createFlashcardSet,
  deleteFlashcardSet,
  getFlashcardSetWithCards,
  updateFlashcardSetCards,
} from '@/server/actions/flashcard-sets'
import type { FlashcardSetItem, FlashcardCard } from '@/server/actions/flashcard-sets'
import { formatDate } from '@/lib/utils'

// ── PDF ───────────────────────────────────────────────────────────────────────

function openFlashcardPrintWindow(title: string, cards: FlashcardCard[]) {
  const win = window.open('', '_blank')
  if (!win) { toast.error('Permita popups para gerar o PDF'); return }
  const cardsHtml = cards.map((c, i) => `
    <div class="card">
      <div class="front">
        <div class="label">Card ${i + 1} — Frente</div>
        <p>${c.front}</p>
      </div>
      <div class="back">
        <div class="label">Verso</div>
        <p>${c.back}</p>
      </div>
    </div>
  `).join('')
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,sans-serif;color:#111;line-height:1.6;font-size:14px;max-width:800px;margin:40px auto;padding:20px}
  h1{font-size:20px;color:#1a3a5c;border-bottom:3px solid #16a34a;padding-bottom:10px;margin-bottom:24px}
  .card{margin-bottom:16px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;page-break-inside:avoid}
  .front{background:#f0fdf4;padding:12px 16px;border-bottom:1px solid #bbf7d0}
  .back{background:#fff;padding:12px 16px}
  .label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
  .front .label{color:#15803d}
  .back .label{color:#6b7280}
  p{margin:0}
  @media print{body{margin:20px;max-width:none}}
</style>
</head>
<body>
<h1>${title}</h1>
${cardsHtml}
<script>window.onload=function(){window.print()}<\/script>
</body>
</html>`)
  win.document.close()
}

// ── Viewer dialog ─────────────────────────────────────────────────────────────

function FlashcardViewer({
  setId, title, open, onClose,
}: { setId: string; title: string; open: boolean; onClose: () => void }) {
  const [cards, setCards] = useState<FlashcardCard[]>([])
  const [loading, setLoading] = useState(false)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!open) { loadedRef.current = false; setCards([]); return }
    if (loadedRef.current) return
    loadedRef.current = true
    setLoading(true)
    getFlashcardSetWithCards(setId).then(data => {
      if (data) setCards(data.cards)
      setLoading(false)
    })
  }, [open, setId])

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            {cards.map((card, i) => (
              <div key={card.id} className="rounded-xl border overflow-hidden">
                <div className="bg-green-50 px-4 py-3 border-b border-green-100">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
                    Frente — Card {i + 1}
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{card.front}</p>
                </div>
                <div className="bg-white px-4 py-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Verso</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{card.back}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Edit dialog ───────────────────────────────────────────────────────────────

function EditFlashcardSetDialog({
  setId, title: initialTitle, open, onClose, onSaved,
}: {
  setId: string
  title: string
  open: boolean
  onClose: () => void
  onSaved: (newTitle: string) => void
}) {
  const [editTitle, setEditTitle] = useState(initialTitle)
  const [cards, setCards] = useState<FlashcardCard[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!open) { loadedRef.current = false; setCards([]); return }
    if (loadedRef.current) return
    loadedRef.current = true
    setLoading(true)
    getFlashcardSetWithCards(setId).then(data => {
      if (data) { setEditTitle(data.set.title); setCards(data.cards) }
      setLoading(false)
    })
  }, [open, setId])

  function updateCard(id: string, field: 'front' | 'back', value: string) {
    setCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  async function handleSave() {
    setSaving(true)
    const res = await updateFlashcardSetCards(setId, { title: editTitle, cards })
    if ('error' in res) {
      toast.error(res.error)
    } else {
      toast.success('Flashcards atualizados')
      onSaved(editTitle)
      onClose()
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[95vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex-shrink-0">
          <DialogTitle className="text-base">Editar Flashcards</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 overflow-hidden p-6 gap-4">
          <div className="space-y-1 flex-shrink-0">
            <Label htmlFor="fc-edit-title">Título do conjunto</Label>
            <Input
              id="fc-edit-title"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {cards.map((card, i) => (
                <div key={card.id} className="rounded-xl border overflow-hidden">
                  <div className="bg-green-50 px-4 py-3 border-b border-green-100">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                      Frente — Card {i + 1}
                    </p>
                    <textarea
                      value={card.front}
                      onChange={e => updateCard(card.id, 'front', e.target.value)}
                      rows={2}
                      className="w-full resize-none text-sm text-gray-800 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div className="bg-white px-4 py-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Verso</p>
                    <textarea
                      value={card.back}
                      onChange={e => updateCard(card.id, 'back', e.target.value)}
                      rows={3}
                      className="w-full resize-none text-sm text-gray-700 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 flex-shrink-0 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Set card (list row) ───────────────────────────────────────────────────────

function FlashcardSetCard({
  set, onDelete, onTitleChange,
}: {
  set: FlashcardSetItem
  onDelete: () => void
  onTitleChange: (newTitle: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [currentTitle, setCurrentTitle] = useState(set.title)

  async function handleDelete() {
    setDeleting(true)
    const res = await deleteFlashcardSet(set.id)
    if ('error' in res) toast.error(res.error)
    else { toast.success('Excluído'); onDelete() }
    setDeleting(false)
  }

  async function handlePDF() {
    setPdfLoading(true)
    const data = await getFlashcardSetWithCards(set.id)
    setPdfLoading(false)
    if (!data) { toast.error('Não foi possível carregar os flashcards'); return }
    openFlashcardPrintWindow(data.set.title, data.cards)
  }

  function handleSaved(newTitle: string) {
    setCurrentTitle(newTitle)
    onTitleChange(newTitle)
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
        <div className="flex items-start gap-3 min-w-0">
          <Brain className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{currentTitle}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {set.cardCount} cards · {formatDate(set.createdAt)}
              {set.apostilaTitle && (
                <> · <span className="text-blue-600">{set.apostilaTitle}</span></>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => setViewOpen(true)}>
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

      <FlashcardViewer
        setId={set.id}
        title={currentTitle}
        open={viewOpen}
        onClose={() => setViewOpen(false)}
      />
      <EditFlashcardSetDialog
        setId={set.id}
        title={currentTitle}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={handleSaved}
      />
    </>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface Props {
  initialSets: FlashcardSetItem[]
  apostilas: { id: string; title: string }[]
}

export function FlashcardSetsPanel({ initialSets, apostilas }: Props) {
  const [sets, setSets] = useState(initialSets)

  const [title, setTitle] = useState('')
  const [apostilaId, setApostilaId] = useState('')
  const [count, setCount] = useState(15)
  const [generating, setGenerating] = useState(false)

  async function handleCreate() {
    if (!title.trim()) { toast.error('Informe o título'); return }
    if (!apostilaId) { toast.error('Selecione uma apostila'); return }
    setGenerating(true)
    const fd = new FormData()
    fd.append('title', title.trim())
    fd.append('apostilaId', apostilaId)
    fd.append('count', String(count))
    const res = await createFlashcardSet(fd)
    setGenerating(false)
    if ('error' in res) { toast.error(res.error); return }
    toast.success(`${res.data.cardCount} flashcards gerados!`)

    // Optimistic add — no refresh needed
    const selectedApostila = apostilas.find(a => a.id === apostilaId)
    setSets(prev => [{
      id: res.data.id,
      title: res.data.title,
      apostilaTitle: selectedApostila?.title ?? null,
      cardCount: res.data.cardCount,
      createdAt: new Date(),
    }, ...prev])

    setTitle('')
    setApostilaId('')
    setCount(15)
  }

  return (
    <div className="space-y-6">
      {/* Creation form */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-green-500" />
          <h2 className="font-semibold text-gray-900">Gerar Flashcards com IA</h2>
        </div>

        <div className="space-y-1">
          <Label htmlFor="fc-title">Título do conjunto <span className="text-red-500">*</span></Label>
          <Input
            id="fc-title"
            placeholder="Ex: Flashcards — Contratos no Direito Civil"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="fc-apostila">Apostila base <span className="text-red-500">*</span></Label>
            <select
              id="fc-apostila"
              value={apostilaId}
              onChange={e => setApostilaId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">— Selecionar apostila —</option>
              {apostilas.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="fc-count">Quantidade de flashcards</Label>
            <Input
              id="fc-count"
              type="number"
              min={5}
              max={30}
              value={count}
              onChange={e => setCount(parseInt(e.target.value) || 15)}
            />
          </div>
        </div>

        <Button
          onClick={handleCreate}
          disabled={generating || !title.trim() || !apostilaId}
          className="w-full"
          size="lg"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando flashcards com IA…</>
            : <><Plus className="w-4 h-4 mr-2" />Criar Flashcards</>}
        </Button>
      </div>

      {/* List */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-900">
          Conjuntos criados
          {sets.length > 0 && <Badge className="ml-2 bg-gray-100 text-gray-600">{sets.length}</Badge>}
        </h2>

        {sets.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center">
            <Brain className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum conjunto criado ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sets.map(s => (
              <FlashcardSetCard
                key={s.id}
                set={s}
                onDelete={() => setSets(prev => prev.filter(x => x.id !== s.id))}
                onTitleChange={newTitle => setSets(prev => prev.map(x => x.id === s.id ? { ...x, title: newTitle } : x))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
