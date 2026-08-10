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
import { Loader2, Plus, Sparkles, Trash2, HelpCircle, Eye, Pencil } from 'lucide-react'
import {
  createExerciseSet,
  deleteExerciseSet,
  getExerciseSetWithQuestions,
  updateExerciseSetQuestions,
} from '@/server/actions/exercises'
import type { ExerciseSetItem, ExerciseQuestion } from '@/server/actions/exercises'
import { formatDate } from '@/lib/utils'

const LETTERS = ['a', 'b', 'c', 'd'] as const

// ── Viewer dialog ─────────────────────────────────────────────────────────────

function ExerciseViewer({
  setId, title, open, onClose,
}: { setId: string; title: string; open: boolean; onClose: () => void }) {
  const [questions, setQuestions] = useState<ExerciseQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!open) { loadedRef.current = false; setQuestions([]); return }
    if (loadedRef.current) return
    loadedRef.current = true
    setLoading(true)
    getExerciseSetWithQuestions(setId).then(data => {
      if (data) setQuestions(data.questions)
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
          <div className="space-y-4 mt-2">
            {questions.map((q, i) => (
              <div key={q.id} className="rounded-xl border overflow-hidden">
                <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">
                    Questão {i + 1}
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{q.statement}</p>
                </div>
                <div className="bg-white px-4 py-3 space-y-1.5">
                  {LETTERS.map(l => {
                    const isCorrect = q.correctAnswer === l
                    return (
                      <div
                        key={l}
                        className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                          isCorrect
                            ? 'bg-green-50 border border-green-200 text-green-800 font-medium'
                            : 'text-gray-700'
                        }`}
                      >
                        <span className={`font-bold uppercase flex-shrink-0 ${isCorrect ? 'text-green-700' : 'text-gray-400'}`}>
                          {l})
                        </span>
                        <span>{q.alternatives[l]}</span>
                        {isCorrect && (
                          <span className="ml-auto text-xs text-green-600 flex-shrink-0">✓ Correta</span>
                        )}
                      </div>
                    )
                  })}
                  {q.explanation && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Explicação</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{q.explanation}</p>
                    </div>
                  )}
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

type EditableQuestion = ExerciseQuestion & {
  alternatives: { a: string; b: string; c: string; d: string }
}

function EditExerciseSetDialog({
  setId, title: initialTitle, open, onClose, onSaved,
}: {
  setId: string
  title: string
  open: boolean
  onClose: () => void
  onSaved: (newTitle: string) => void
}) {
  const [editTitle, setEditTitle] = useState(initialTitle)
  const [questions, setQuestions] = useState<EditableQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!open) { loadedRef.current = false; setQuestions([]); return }
    if (loadedRef.current) return
    loadedRef.current = true
    setLoading(true)
    getExerciseSetWithQuestions(setId).then(data => {
      if (data) {
        setEditTitle(data.set.title)
        setQuestions(data.questions as EditableQuestion[])
      }
      setLoading(false)
    })
  }, [open, setId])

  function updateStatement(id: string, value: string) {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, statement: value } : q))
  }

  function updateAlternative(id: string, letter: 'a' | 'b' | 'c' | 'd', value: string) {
    setQuestions(prev => prev.map(q =>
      q.id === id ? { ...q, alternatives: { ...q.alternatives, [letter]: value } } : q
    ))
  }

  function updateCorrectAnswer(id: string, value: string) {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, correctAnswer: value } : q))
  }

  function updateExplanation(id: string, value: string) {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, explanation: value } : q))
  }

  async function handleSave() {
    setSaving(true)
    const res = await updateExerciseSetQuestions(setId, {
      title: editTitle,
      questions: questions.map(q => ({
        id: q.id,
        statement: q.statement,
        alternatives: q.alternatives,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      })),
    })
    if ('error' in res) {
      toast.error(res.error)
    } else {
      toast.success('Exercícios atualizados')
      onSaved(editTitle)
      onClose()
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[95vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex-shrink-0">
          <DialogTitle className="text-base">Editar Exercícios</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 overflow-hidden p-6 gap-4">
          <div className="space-y-1 flex-shrink-0">
            <Label htmlFor="ex-edit-title">Título do conjunto</Label>
            <Input
              id="ex-edit-title"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-xl border overflow-hidden">
                  {/* Statement */}
                  <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">
                      Questão {i + 1} — Enunciado
                    </p>
                    <textarea
                      value={q.statement}
                      onChange={e => updateStatement(q.id, e.target.value)}
                      rows={3}
                      className="w-full resize-none text-sm text-gray-800 bg-transparent focus:outline-none"
                    />
                  </div>

                  {/* Alternatives */}
                  <div className="bg-white px-4 py-3 space-y-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Alternativas</p>
                    {LETTERS.map(l => (
                      <div key={l} className="flex items-center gap-2">
                        <span className="font-bold uppercase text-gray-400 text-sm w-5 flex-shrink-0">{l})</span>
                        <input
                          type="text"
                          value={q.alternatives[l]}
                          onChange={e => updateAlternative(q.id, l, e.target.value)}
                          className="flex-1 text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-300"
                        />
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={q.correctAnswer === l}
                          onChange={() => updateCorrectAnswer(q.id, l)}
                          className="accent-green-600"
                          title="Marcar como correta"
                        />
                      </div>
                    ))}
                    <p className="text-xs text-gray-400">Selecione o botão à direita para marcar a resposta correta</p>
                  </div>

                  {/* Explanation */}
                  <div className="bg-white px-4 py-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Explicação (opcional)</p>
                    <textarea
                      value={q.explanation ?? ''}
                      onChange={e => updateExplanation(q.id, e.target.value || null as any)}
                      rows={2}
                      className="w-full resize-none text-sm text-gray-700 bg-transparent focus:outline-none"
                      placeholder="Explicação da resposta correta…"
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

function ExerciseSetCard({
  set, onDelete, onTitleChange,
}: {
  set: ExerciseSetItem
  onDelete: () => void
  onTitleChange: (newTitle: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [currentTitle, setCurrentTitle] = useState(set.title)

  async function handleDelete() {
    setDeleting(true)
    const res = await deleteExerciseSet(set.id)
    if ('error' in res) toast.error(res.error)
    else { toast.success('Excluído'); onDelete() }
    setDeleting(false)
  }

  function handleSaved(newTitle: string) {
    setCurrentTitle(newTitle)
    onTitleChange(newTitle)
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
        <div className="flex items-start gap-3 min-w-0">
          <HelpCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{currentTitle}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {set.questionCount} questões · {formatDate(set.createdAt)}
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

      <ExerciseViewer
        setId={set.id}
        title={currentTitle}
        open={viewOpen}
        onClose={() => setViewOpen(false)}
      />
      <EditExerciseSetDialog
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
  initialSets: ExerciseSetItem[]
  apostilas: { id: string; title: string }[]
}

export function ExercisesPanel({ initialSets, apostilas }: Props) {
  const [sets, setSets] = useState(initialSets)

  const [title, setTitle] = useState('')
  const [apostilaId, setApostilaId] = useState('')
  const [count, setCount] = useState(10)
  const [generating, setGenerating] = useState(false)

  async function handleCreate() {
    if (!title.trim()) { toast.error('Informe o título'); return }
    if (!apostilaId) { toast.error('Selecione uma apostila'); return }
    setGenerating(true)
    const fd = new FormData()
    fd.append('title', title.trim())
    fd.append('apostilaId', apostilaId)
    fd.append('count', String(count))
    const res = await createExerciseSet(fd)
    setGenerating(false)
    if ('error' in res) { toast.error(res.error); return }
    toast.success(`${res.data.questionCount} questões geradas!`)

    // Optimistic add — no refresh needed
    const selectedApostila = apostilas.find(a => a.id === apostilaId)
    setSets(prev => [{
      id: res.data.id,
      title: res.data.title,
      apostilaTitle: selectedApostila?.title ?? null,
      questionCount: res.data.questionCount,
      createdAt: new Date(),
    }, ...prev])

    setTitle('')
    setApostilaId('')
    setCount(10)
  }

  return (
    <div className="space-y-6">
      {/* Creation form */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h2 className="font-semibold text-gray-900">Gerar Exercícios com IA</h2>
        </div>

        <div className="space-y-1">
          <Label htmlFor="ex-title">Título do conjunto <span className="text-red-500">*</span></Label>
          <Input
            id="ex-title"
            placeholder="Ex: Exercícios — Contratos no Direito Civil"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="ex-apostila">Apostila base <span className="text-red-500">*</span></Label>
            <select
              id="ex-apostila"
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
            <Label htmlFor="ex-count">Quantidade de questões</Label>
            <Input
              id="ex-count"
              type="number"
              min={3}
              max={20}
              value={count}
              onChange={e => setCount(parseInt(e.target.value) || 10)}
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
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando questões com IA…</>
            : <><Plus className="w-4 h-4 mr-2" />Criar Exercícios</>}
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
            <HelpCircle className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum conjunto criado ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sets.map(s => (
              <ExerciseSetCard
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
