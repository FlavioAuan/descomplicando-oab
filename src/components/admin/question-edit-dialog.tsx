'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type Alts = { a: string; b: string; c: string; d: string }

export type ClassificationOptions = {
  subjects: { id: string; name: string; color: string | null }[]
  subsubjects: { id: string; subjectId: string; name: string }[]
  ebookTopics: { id: string; subjectId: string; name: string }[]
}

export type QuestionEditPatch = {
  statement: string
  alternatives: Alts
  correctAnswer: string
  subjectId: string | null
  subsubjectId: string | null
  ebookTopicId: string | null
}

interface QuestionEditDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (patch: QuestionEditPatch) => void
  options: ClassificationOptions
  question: {
    id: string
    number: number
    examNumber: number
    examYear: number
    statement: string
    alternatives: Alts
    correctAnswer: string
    subjectId: string | null
    subsubjectId: string | null
    ebookTopicId: string | null
  }
}

// Radix Select doesn't accept '' as a value
const NONE = '_none'

const ALT_LABELS: { key: keyof Alts; label: string }[] = [
  { key: 'a', label: 'A)' },
  { key: 'b', label: 'B)' },
  { key: 'c', label: 'C)' },
  { key: 'd', label: 'D)' },
]

export function QuestionEditDialog({
  open,
  onClose,
  onSaved,
  options,
  question,
}: QuestionEditDialogProps) {
  const [statement, setStatement] = useState(question.statement)
  const [alts, setAlts] = useState<Alts>({ ...question.alternatives })
  const [correct, setCorrect] = useState(question.correctAnswer?.toLowerCase() ?? 'a')
  const [subjectId, setSubjectId] = useState(question.subjectId ?? NONE)
  const [subsubjectId, setSubsubjectId] = useState(question.subsubjectId ?? NONE)
  const [ebookTopicId, setEbookTopicId] = useState(question.ebookTopicId ?? NONE)
  const [saving, setSaving] = useState(false)

  const subsubjectOptions = options.subsubjects.filter((s) => s.subjectId === subjectId)
  const ebookTopicOptions = options.ebookTopics.filter((t) => t.subjectId === subjectId)

  function changeSubject(value: string) {
    setSubjectId(value)
    setSubsubjectId(NONE)
    setEbookTopicId(NONE)
  }

  function changeSubsubject(value: string) {
    setSubsubjectId(value)
  }
  const [error, setError] = useState('')

  function setAlt(key: keyof Alts, value: string) {
    setAlts((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!statement.trim()) {
      setError('O enunciado não pode estar vazio.')
      return
    }
    setSaving(true)
    setError('')
    const classification = {
      subjectId: subjectId === NONE ? null : subjectId,
      subsubjectId: subsubjectId === NONE ? null : subsubjectId,
      ebookTopicId: ebookTopicId === NONE ? null : ebookTopicId,
    }
    try {
      const res = await fetch(`/api/admin/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement: statement.trim(), alternatives: alts, correctAnswer: correct, classification }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Erro ao salvar.')
        return
      }
      onSaved({ statement: statement.trim(), alternatives: alts, correctAnswer: correct, ...classification })
      onClose()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar Questão — {question.examNumber}º Exame ({question.examYear}) · Q{question.number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Enunciado */}
          <div className="space-y-1.5">
            <Label>Enunciado</Label>
            <Textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              rows={5}
              className="text-sm resize-y"
            />
          </div>

          {/* Alternativas */}
          <div className="space-y-2">
            <Label>Alternativas</Label>
            {ALT_LABELS.map(({ key, label }) => {
              const isCorrect = correct === key
              return (
                <div key={key} className="flex items-start gap-2">
                  <span
                    className={cn(
                      'mt-2 w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold',
                      isCorrect
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    )}
                  >
                    {label.replace(')', '')}
                  </span>
                  <Textarea
                    value={alts[key]}
                    onChange={(e) => setAlt(key, e.target.value)}
                    rows={2}
                    className={cn(
                      'text-sm resize-y flex-1',
                      isCorrect && 'border-green-300 bg-green-50'
                    )}
                  />
                </div>
              )
            })}
          </div>

          {/* Gabarito */}
          <div className="space-y-1.5">
            <Label>Gabarito (resposta correta)</Label>
            <Select value={correct} onValueChange={setCorrect}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    Alternativa {opt.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Classificação */}
          <div className="space-y-2">
            <Label>Classificação</Label>
            <div className="space-y-2">
              <div className="space-y-1">
                <span className="text-xs text-gray-500">Disciplina</span>
                <Select value={subjectId} onValueChange={changeSubject}>
                  <SelectTrigger className="text-sm text-left">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Não classificada</SelectItem>
                    {options.subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0 inline-block"
                            style={{ backgroundColor: s.color ?? '#2563EB' }}
                          />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-gray-500">Subtema</span>
                <Select value={subsubjectId} onValueChange={changeSubsubject} disabled={subjectId === NONE}>
                  <SelectTrigger className="text-sm text-left">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhum</SelectItem>
                    {subsubjectOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-gray-500">Tópico do Ebook</span>
                <Select value={ebookTopicId} onValueChange={setEbookTopicId} disabled={subjectId === NONE}>
                  <SelectTrigger className="text-sm text-left">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhum</SelectItem>
                    {ebookTopicOptions.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
