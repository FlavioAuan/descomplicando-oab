'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  X,
  Filter,
  Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { QuestionEditDialog } from '@/components/admin/question-edit-dialog'

type Question = {
  id: string
  number: number
  statement: string
  alternatives: { a: string; b: string; c: string; d: string }
  correctAnswer: string
  classified: boolean | null
  examNumber: number
  examYear: number
  subjectId: string | null
  subjectName: string | null
  subjectColor: string | null
  subsubjectName: string | null
}

type Subject = { id: string; name: string; color: string | null }
type ExamRef = { examNumber: number; year: number }

interface Filters {
  subject: string
  year: string
  exam: string
  question: string
}

interface QuestionsViewProps {
  questions: Question[]
  subjects: Subject[]
  exams: ExamRef[]
  total: number
  page: number
  pageSize: number
  filters: Filters
}

const ANSWER_COLORS: Record<string, string> = {
  a: 'bg-blue-100 text-blue-700',
  b: 'bg-green-100 text-green-700',
  c: 'bg-purple-100 text-purple-700',
  d: 'bg-orange-100 text-orange-700',
}

function AnswerBadge({ answer }: { answer: string }) {
  if (!answer) {
    return <Badge variant="secondary" className="text-xs font-mono">ANULADA</Badge>
  }
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold',
        ANSWER_COLORS[answer.toLowerCase()] ?? 'bg-gray-100 text-gray-700'
      )}
    >
      {answer.toUpperCase()}
    </span>
  )
}

function QuestionRow({ q: initial }: { q: Question }) {
  const [expanded, setExpanded] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [q, setQ] = useState(initial)

  const preview = q.statement.length > 120 ? q.statement.slice(0, 120) + '…' : q.statement

  return (
    <>
      <div className="border rounded-lg bg-white overflow-hidden">
        <div
          className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          {/* Prova + Questão */}
          <div className="flex-shrink-0 text-center min-w-[56px]">
            <div className="text-xs font-bold text-gray-700">{q.examNumber}º Exame</div>
            <div className="text-xs text-gray-400">{q.examYear}</div>
            <div
              className="mt-1 text-xs font-semibold rounded px-1.5 py-0.5"
              style={{ backgroundColor: '#C9A22720', color: '#8a6a10' }}
            >
              Q{q.number}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-gray-200 self-stretch flex-shrink-0" />

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-sm text-gray-700 leading-relaxed">
              {expanded ? q.statement : preview}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {q.subjectName ? (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: (q.subjectColor ?? '#2563EB') + '20',
                    color: q.subjectColor ?? '#2563EB',
                  }}
                >
                  {q.subjectName}
                </span>
              ) : (
                <span className="text-xs text-gray-400 italic">Não classificada</span>
              )}
              {q.subsubjectName && (
                <span className="text-xs text-gray-500">· {q.subsubjectName}</span>
              )}
            </div>
          </div>

          {/* Answer + edit + expand */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <AnswerBadge answer={q.correctAnswer} />
            <button
              onClick={(e) => { e.stopPropagation(); setEditOpen(true) }}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors px-1.5 py-0.5 rounded hover:bg-blue-50"
              title="Editar questão"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </button>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Expanded alternatives */}
        {expanded && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
            {(['a', 'b', 'c', 'd'] as const).map((opt) => {
              const isCorrect = q.correctAnswer?.toLowerCase() === opt
              return (
                <div
                  key={opt}
                  className={cn(
                    'flex items-start gap-2 p-2 rounded-lg text-sm',
                    isCorrect
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-gray-50 border border-transparent'
                  )}
                >
                  <span
                    className={cn(
                      'font-bold uppercase w-5 flex-shrink-0',
                      isCorrect ? 'text-green-700' : 'text-gray-500'
                    )}
                  >
                    {opt})
                  </span>
                  <span className={isCorrect ? 'text-green-800' : 'text-gray-700'}>
                    {q.alternatives[opt] || <em className="text-gray-400">—</em>}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editOpen && (
        <QuestionEditDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          question={q}
          onSaved={(patch) =>
            setQ((prev) => ({ ...prev, ...patch }))
          }
        />
      )}
    </>
  )
}

export function QuestionsView({
  questions,
  subjects,
  exams,
  total,
  page,
  pageSize,
  filters,
}: QuestionsViewProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [localQuestion, setLocalQuestion] = useState(filters.question)

  const totalPages = Math.ceil(total / pageSize)

  const push = useCallback(
    (next: Partial<Filters & { page: string }>) => {
      const p = new URLSearchParams()
      const merged = { ...filters, page: String(page), ...next }
      if (merged.subject) p.set('subject', merged.subject)
      if (merged.year) p.set('year', merged.year)
      if (merged.exam) p.set('exam', merged.exam)
      if (merged.question) p.set('question', merged.question)
      if (merged.page && merged.page !== '1') p.set('page', merged.page)
      router.push(`${pathname}?${p.toString()}`)
    },
    [filters, page, pathname, router]
  )

  const hasFilters =
    filters.subject || filters.year || filters.exam || filters.question

  const distinctYears = [...new Set(exams.map((e) => e.year))].sort((a, b) => b - a)
  const distinctExams = [...new Set(exams.map((e) => e.examNumber))].sort((a, b) => b - a)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Questões das Provas</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {total.toLocaleString('pt-BR')} questão{total !== 1 ? 'ões' : ''} encontrada{total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros</span>
            {hasFilters && (
              <button
                onClick={() => {
                  setLocalQuestion('')
                  push({ subject: '', year: '', exam: '', question: '', page: '1' })
                }}
                className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
              >
                <X className="w-3.5 h-3.5" /> Limpar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Disciplina */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Disciplina</label>
              <Select
                value={filters.subject || '_all'}
                onValueChange={(v) =>
                  push({ subject: v === '_all' ? '' : v, page: '1' })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas as disciplinas</SelectItem>
                  {subjects.map((s) => (
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

            {/* Ano */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Ano</label>
              <Select
                value={filters.year || '_all'}
                onValueChange={(v) =>
                  push({ year: v === '_all' ? '' : v, page: '1' })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos os anos</SelectItem>
                  {distinctYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Número da Prova */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Número da Prova</label>
              <Select
                value={filters.exam || '_all'}
                onValueChange={(v) =>
                  push({ exam: v === '_all' ? '' : v, page: '1' })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos os exames</SelectItem>
                  {distinctExams.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}º Exame
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Número da Questão */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Número da Questão</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={80}
                  placeholder="1 – 80"
                  className="h-9 text-sm"
                  value={localQuestion}
                  onChange={(e) => setLocalQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      push({ question: localQuestion, page: '1' })
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9 px-3"
                  onClick={() => push({ question: localQuestion, page: '1' })}
                >
                  OK
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions list */}
      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma questão encontrada</p>
            <p className="text-gray-400 text-sm mt-1">Tente outros filtros</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <QuestionRow key={q.id} q={q} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-gray-500">
            Página {page} de {totalPages} · {total.toLocaleString('pt-BR')} resultados
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => push({ page: String(page - 1) })}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => push({ page: String(page + 1) })}
            >
              Próxima <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
