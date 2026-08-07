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

interface QuestionEditDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (patch: { statement: string; alternatives: Alts; correctAnswer: string }) => void
  question: {
    id: string
    number: number
    examNumber: number
    examYear: number
    statement: string
    alternatives: Alts
    correctAnswer: string
  }
}

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
  question,
}: QuestionEditDialogProps) {
  const [statement, setStatement] = useState(question.statement)
  const [alts, setAlts] = useState<Alts>({ ...question.alternatives })
  const [correct, setCorrect] = useState(question.correctAnswer?.toLowerCase() ?? 'a')
  const [saving, setSaving] = useState(false)
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
    try {
      const res = await fetch(`/api/admin/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement: statement.trim(), alternatives: alts, correctAnswer: correct }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Erro ao salvar.')
        return
      }
      onSaved({ statement: statement.trim(), alternatives: alts, correctAnswer: correct })
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
