'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ClipboardList,
  Clock,
  Hash,
  Brain,
  BarChart2,
  ListChecks,
  Zap,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Search,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type Subject = {
  id: string
  name: string
  color: string | null
  percentage: number
  totalQuestions: number
  avgPerExam: number
  trend: string
  availableCount: number
}

type ExamRef = { examNumber: number; year: number }

type SearchQuestion = {
  id: string
  number: number
  statement: string
  correctAnswer: string
  examNumber: number
  examYear: number
  subjectName: string | null
  subjectColor: string | null
}

type Mode = 'historico' | 'disciplinas' | 'manual'

const TYPE_OPTIONS = [
  { value: 'general', label: 'Geral', icon: ClipboardList },
  { value: 'subject', label: 'Por Disciplina', icon: ListChecks },
  { value: 'topic', label: 'Por Tópico', icon: Zap },
  { value: 'predicted', label: 'Previstos (IA)', icon: BarChart2 },
  { value: 'adaptive', label: 'Adaptativo', icon: Brain },
]

// ─── Proportional distribution (largest remainder) ────────────────────────────

function distributeByHistory(
  subjects: Subject[],
  total: number
): Map<string, number> {
  const valid = subjects.filter((s) => s.percentage > 0 && s.availableCount > 0)
  const totalPct = valid.reduce((a, s) => a + s.percentage, 0)
  if (totalPct === 0) return new Map()

  const raw = valid.map((s) => ({
    id: s.id,
    raw: (s.percentage / totalPct) * total,
    available: s.availableCount,
  }))

  const floors = raw.map((s) => Math.min(Math.floor(s.raw), s.available))
  const floorSum = floors.reduce((a, b) => a + b, 0)
  const remainder = Math.min(total - floorSum, valid.length)

  const sorted = raw
    .map((s, i) => ({ ...s, frac: s.raw - Math.floor(s.raw), floor: floors[i] }))
    .sort((a, b) => b.frac - a.frac)

  const result = new Map<string, number>()
  sorted.forEach((s, i) => {
    const extra = i < remainder && s.floor < s.available ? 1 : 0
    result.set(s.id, s.floor + extra)
  })
  return result
}

// ─── Historical preview table ─────────────────────────────────────────────────

function HistoricalPreview({
  subjects,
  total,
}: {
  subjects: Subject[]
  total: number
}) {
  const dist = distributeByHistory(subjects, total)
  const rows = subjects
    .filter((s) => s.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage)
    .map((s) => ({ ...s, allocated: dist.get(s.id) ?? 0 }))

  const allocated = rows.reduce((a, r) => a + r.allocated, 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 font-medium">Distribuição por histórico</span>
        <span className={cn('font-semibold', allocated === total ? 'text-green-600' : 'text-orange-500')}>
          {allocated} / {total} questões alocadas
        </span>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Disciplina</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">% Histórico</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Média/Prova</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Questões</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Disponíveis</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((s) => (
              <tr key={s.id} className={cn(s.allocated === 0 && 'opacity-40')}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.color ?? '#2563EB' }}
                    />
                    <span className="text-gray-700">{s.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right text-gray-500">
                  {(s.percentage * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right text-gray-500">
                  {s.avgPerExam.toFixed(1)}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-gray-800">
                  {s.allocated}
                </td>
                <td className="px-3 py-2 text-right text-gray-400 text-xs">
                  {s.availableCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Discipline selector ──────────────────────────────────────────────────────

function DisciplineSelector({
  subjects,
  total,
  distribution,
  onChange,
}: {
  subjects: Subject[]
  total: number
  distribution: Record<string, number>
  onChange: (d: Record<string, number>) => void
}) {
  const allocated = Object.values(distribution).reduce((a, b) => a + b, 0)
  const remaining = total - allocated

  function toggleSubject(id: string) {
    if (distribution[id] !== undefined) {
      const next = { ...distribution }
      delete next[id]
      onChange(next)
    } else {
      onChange({ ...distribution, [id]: 0 })
    }
  }

  function setCount(id: string, val: string) {
    const n = Math.max(0, Math.min(parseInt(val) || 0, subjects.find((s) => s.id === id)?.availableCount ?? 999))
    onChange({ ...distribution, [id]: n })
  }

  function autoDistribute() {
    const selected = Object.keys(distribution)
    if (selected.length === 0) return
    const base = Math.floor(total / selected.length)
    const rem = total % selected.length
    const next: Record<string, number> = {}
    selected.forEach((id, i) => {
      const avail = subjects.find((s) => s.id === id)?.availableCount ?? 0
      next[id] = Math.min(base + (i < rem ? 1 : 0), avail)
    })
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className={cn('text-sm font-semibold', allocated > total ? 'text-red-600' : allocated === total ? 'text-green-600' : 'text-gray-700')}>
            {allocated} / {total} questões selecionadas
          </span>
          {remaining > 0 && (
            <span className="text-xs text-gray-400">(faltam {remaining})</span>
          )}
          {allocated > total && (
            <span className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Excede o total
            </span>
          )}
        </div>
        {Object.keys(distribution).length > 0 && (
          <Button variant="outline" size="sm" onClick={autoDistribute} className="text-xs h-7">
            Distribuir igualmente
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {subjects
          .filter((s) => s.availableCount > 0)
          .sort((a, b) => b.percentage - a.percentage)
          .map((s) => {
            const selected = distribution[s.id] !== undefined
            return (
              <div
                key={s.id}
                onClick={() => toggleSubject(s.id)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                  selected
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: s.color ?? '#2563EB' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{s.name}</div>
                  <div className="text-xs text-gray-400">
                    {(s.percentage * 100).toFixed(1)}% histórico · {s.availableCount} disp.
                  </div>
                </div>
                {selected && (
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Input
                      type="number"
                      min={0}
                      max={s.availableCount}
                      value={distribution[s.id]}
                      onChange={(e) => setCount(s.id, e.target.value)}
                      className="w-16 h-7 text-center text-sm p-1"
                    />
                  </div>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

// ─── Manual question picker ───────────────────────────────────────────────────

function ManualPicker({
  subjects,
  exams,
  selected,
  onChange,
}: {
  subjects: Subject[]
  exams: ExamRef[]
  selected: Map<string, SearchQuestion>
  onChange: (m: Map<string, SearchQuestion>) => void
}) {
  const [filterSubject, setFilterSubject] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterExam, setFilterExam] = useState('')
  const [results, setResults] = useState<SearchQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)

  const LIMIT = 20
  const distinctYears = [...new Set(exams.map((e) => e.year))].sort((a, b) => b - a)
  const distinctExams = [...new Set(exams.map((e) => e.examNumber))].sort((a, b) => b - a)

  async function search(newOffset = 0) {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (filterSubject) p.set('subject', filterSubject)
      if (filterYear) p.set('year', filterYear)
      if (filterExam) p.set('exam', filterExam)
      p.set('limit', String(LIMIT))
      p.set('offset', String(newOffset))
      const res = await fetch(`/api/admin/questions/search?${p}`)
      const data = await res.json()
      setResults(data.questions)
      setOffset(newOffset)
    } finally {
      setLoading(false)
    }
  }

  function toggle(q: SearchQuestion) {
    const next = new Map(selected)
    if (next.has(q.id)) next.delete(q.id)
    else next.set(q.id, q)
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {/* Search filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select value={filterSubject || '_all'} onValueChange={(v) => setFilterSubject(v === '_all' ? '' : v)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Disciplina" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas as disciplinas</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterYear || '_all'} onValueChange={(v) => setFilterYear(v === '_all' ? '' : v)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os anos</SelectItem>
            {distinctYears.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterExam || '_all'} onValueChange={(v) => setFilterExam(v === '_all' ? '' : v)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Nº Exame" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os exames</SelectItem>
            {distinctExams.map((n) => (
              <SelectItem key={n} value={String(n)}>{n}º Exame</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={() => search(0)} disabled={loading} className="w-full sm:w-auto">
        <Search className="w-4 h-4 mr-2" />
        {loading ? 'Buscando…' : 'Buscar questões'}
      </Button>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            Exibindo {offset + 1}–{offset + results.length} · clique para adicionar/remover
          </p>
          {results.map((q) => {
            const isSelected = selected.has(q.id)
            return (
              <div
                key={q.id}
                onClick={() => toggle(q)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                  isSelected
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                  isSelected ? 'bg-green-500' : 'bg-gray-200'
                )}>
                  {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-semibold text-gray-500">
                      {q.examNumber}º Exame {q.examYear} · Q{q.number}
                    </span>
                    {q.subjectName && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: (q.subjectColor ?? '#2563EB') + '20',
                          color: q.subjectColor ?? '#2563EB',
                        }}
                      >
                        {q.subjectName}
                      </span>
                    )}
                    <span className="text-xs ml-auto font-bold text-gray-600">
                      Gabarito: {q.correctAnswer?.toUpperCase() || 'ANULADA'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{q.statement}</p>
                </div>
              </div>
            )
          })}
          <div className="flex items-center justify-between pt-1">
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => search(offset - LIMIT)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={results.length < LIMIT} onClick={() => search(offset + LIMIT)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Selected summary */}
      {selected.size > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-green-700">
              {selected.size} questão{selected.size !== 1 ? 'ões' : ''} selecionada{selected.size !== 1 ? 's' : ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
              onClick={() => onChange(new Map())}
            >
              Limpar tudo
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {[...selected.values()].map((q) => (
              <span
                key={q.id}
                className="inline-flex items-center gap-1 text-xs bg-white border border-green-300 text-green-700 rounded-full px-2 py-0.5 cursor-pointer hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                onClick={() => toggle(q)}
              >
                {q.examNumber}º·Q{q.number}
                <X className="w-3 h-3" />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

interface SimulationCreateFormProps {
  subjects: Subject[]
  exams: ExamRef[]
}

export function SimulationCreateForm({ subjects, exams }: SimulationCreateFormProps) {
  const router = useRouter()

  // Basic info
  const [name, setName] = useState('')
  const [type, setType] = useState('general')
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(300)
  const [totalQuestions, setTotalQuestions] = useState(40)

  // Mode
  const [mode, setMode] = useState<Mode>('historico')

  // Disciplinas mode state
  const [distribution, setDistribution] = useState<Record<string, number>>({})

  // Manual mode state
  const [manualSelected, setManualSelected] = useState<Map<string, SearchQuestion>>(new Map())

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const allocatedDisciplinas = Object.values(distribution).reduce((a, b) => a + b, 0)

  async function handleSubmit() {
    if (!name.trim()) { setError('Informe o nome do simulado.'); return }
    if (mode === 'disciplinas' && allocatedDisciplinas === 0) {
      setError('Selecione pelo menos uma disciplina e defina a quantidade de questões.')
      return
    }
    if (mode === 'manual' && manualSelected.size === 0) {
      setError('Selecione pelo menos uma questão.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const body: Record<string, unknown> = {
        name,
        type,
        timeLimitMinutes,
        totalQuestions: mode === 'manual' ? manualSelected.size : totalQuestions,
        mode,
      }

      if (mode === 'disciplinas') body.distribution = distribution
      if (mode === 'manual') body.questionIds = [...manualSelected.keys()]

      const res = await fetch('/api/admin/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erro ao criar simulado.')
        return
      }

      router.push('/admin/simulations')
      router.refresh()
    } catch {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/admin/simulations">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Criar Simulado</h1>
          <p className="text-gray-500 text-sm mt-0.5">Configure e gere um novo simulado para os alunos</p>
        </div>
      </div>

      {/* ── Informações Básicas ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Nome do Simulado <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Ex: Simulado Geral OAB 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Tipo</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Tempo Limite (min)
              </label>
              <Input
                type="number"
                min={10}
                max={600}
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(parseInt(e.target.value) || 300)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" /> Total de Questões
              </label>
              <Input
                type="number"
                min={1}
                max={80}
                value={totalQuestions}
                disabled={mode === 'manual'}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(80, parseInt(e.target.value) || 40))
                  setTotalQuestions(v)
                }}
              />
              {mode === 'manual' && (
                <p className="text-xs text-gray-400">Definido pela seleção manual</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Modo de Geração ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Modo de Geração de Questões</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode radio */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              [
                {
                  value: 'historico',
                  title: 'Distribuição Histórica',
                  desc: 'Gera aleatoriamente respeitando o % de cada disciplina nas provas reais da OAB',
                  icon: BarChart2,
                  color: 'blue',
                },
                {
                  value: 'disciplinas',
                  title: 'Selecionar Disciplinas',
                  desc: 'Escolha quais disciplinas incluir e defina a quantidade de questões de cada uma',
                  icon: ListChecks,
                  color: 'purple',
                },
                {
                  value: 'manual',
                  title: 'Seleção Manual',
                  desc: 'Busque e selecione cada questão individualmente por prova, ano e disciplina',
                  icon: ClipboardList,
                  color: 'green',
                },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon
              const active = mode === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  className={cn(
                    'text-left p-4 rounded-xl border-2 transition-all',
                    active
                      ? opt.color === 'blue'
                        ? 'border-blue-500 bg-blue-50'
                        : opt.color === 'purple'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 mb-2',
                      active
                        ? opt.color === 'blue'
                          ? 'text-blue-600'
                          : opt.color === 'purple'
                          ? 'text-purple-600'
                          : 'text-green-600'
                        : 'text-gray-400'
                    )}
                  />
                  <div className="font-semibold text-sm text-gray-800 mb-1">{opt.title}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{opt.desc}</div>
                </button>
              )
            })}
          </div>

          {/* Mode content */}
          <div className="pt-2">
            {mode === 'historico' && (
              <HistoricalPreview subjects={subjects} total={totalQuestions} />
            )}
            {mode === 'disciplinas' && (
              <DisciplineSelector
                subjects={subjects}
                total={totalQuestions}
                distribution={distribution}
                onChange={setDistribution}
              />
            )}
            {mode === 'manual' && (
              <ManualPicker
                subjects={subjects}
                exams={exams}
                selected={manualSelected}
                onChange={setManualSelected}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Submit ── */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-gray-50 border rounded-xl p-4">
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <span className="flex items-center gap-1.5">
            <Hash className="w-4 h-4 text-gray-400" />
            <strong className="text-gray-900">
              {mode === 'manual' ? manualSelected.size : totalQuestions}
            </strong>{' '}
            questões
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-gray-400" />
            <strong className="text-gray-900">{timeLimitMinutes}</strong> min
          </span>
          <span className="flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-gray-400" />
            {TYPE_OPTIONS.find((t) => t.value === type)?.label}
          </span>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/admin/simulations">Cancelar</Link>
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            style={{ backgroundColor: '#C9A227' }}
            className="text-gray-900 hover:opacity-90 font-semibold min-w-[160px]"
          >
            {submitting ? 'Criando simulado…' : 'Criar Simulado'}
          </Button>
        </div>
      </div>
    </div>
  )
}
