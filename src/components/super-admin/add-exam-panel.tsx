'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  Upload, FileText, CheckCircle2, AlertCircle,
  Loader2, Brain, Database, ChevronRight,
} from 'lucide-react'
import {
  extractExamFromFiles,
  classifyQuestions,
  saveExam,
} from '@/server/actions/add-exam'
import type { ParsedQuestion, ClassifiedQuestion } from '@/server/actions/add-exam'

type Step = 'upload' | 'extracting' | 'review' | 'classifying' | 'saving' | 'done'

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { id: 'upload', label: 'Upload' },
  { id: 'review', label: 'Revisão' },
  { id: 'classifying', label: 'Classificação' },
  { id: 'done', label: 'Salvo' },
]

function StepBar({ current }: { current: Step }) {
  const order = ['upload', 'extracting', 'review', 'classifying', 'saving', 'done']
  const idx = order.indexOf(current)
  const displaySteps = STEPS
  return (
    <div className="flex items-center gap-2 mb-6">
      {displaySteps.map((s, i) => {
        const stepOrder = ['upload', 'review', 'classifying', 'done']
        const stepIdx = stepOrder.indexOf(s.id)
        const done = idx > order.indexOf(s.id)
        const active = s.id === current || (s.id === 'review' && current === 'extracting') ||
          (s.id === 'classifying' && current === 'saving')
        return (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              done ? 'bg-green-500 text-white'
              : active ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-500'
            }`}>
              {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm ${active ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>
              {s.label}
            </span>
            {i < displaySteps.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
          </div>
        )
      })}
    </div>
  )
}

// ─── File drop zone ───────────────────────────────────────────────────────────

function FileInput({ label, id, file, onChange }: {
  label: string; id: string; file: File | null; onChange: (f: File | null) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div
      onClick={() => ref.current?.click()}
      className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors ${
        file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 bg-gray-50'
      }`}
    >
      <input
        ref={ref} id={id} type="file" accept=".pdf"
        className="hidden"
        onChange={e => onChange(e.target.files?.[0] ?? null)}
      />
      <div className="flex items-center gap-3">
        {file
          ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          : <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-xs text-gray-400 truncate">
            {file ? file.name : 'Clique para selecionar PDF'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Questions table ──────────────────────────────────────────────────────────

function QuestionsTable({ questions }: { questions: (ParsedQuestion | ClassifiedQuestion)[] }) {
  const [expanded, setExpanded] = useState<number | null>(null)
  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-gray-600 w-10">#</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600">Enunciado</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600 w-16">Resp.</th>
              {'discipline' in (questions[0] ?? {}) && (
                <th className="text-left px-3 py-2 font-semibold text-gray-600 w-40">Disciplina</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {questions.map(q => (
              <tr
                key={q.number}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpanded(expanded === q.number ? null : q.number)}
              >
                <td className="px-3 py-2 text-gray-500 font-mono">{q.number}</td>
                <td className="px-3 py-2 text-gray-700">
                  <p className="line-clamp-1">{q.statement}</p>
                  {expanded === q.number && (
                    <div className="mt-2 space-y-1 text-xs text-gray-600 bg-gray-50 rounded p-2">
                      <p>{q.statement}</p>
                      <div className="grid grid-cols-2 gap-1 mt-2">
                        {(['a','b','c','d'] as const).map(k => (
                          <p key={k} className={`px-2 py-1 rounded ${q.correctAnswer === k ? 'bg-green-100 text-green-800 font-medium' : ''}`}>
                            {k.toUpperCase()}) {q.alternatives[k]}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  {q.correctAnswer
                    ? <Badge className="bg-blue-100 text-blue-700 font-mono">{q.correctAnswer.toUpperCase()}</Badge>
                    : <span className="text-gray-300 text-xs">—</span>}
                </td>
                {'discipline' in q && (
                  <td className="px-3 py-2">
                    <span className="text-xs text-gray-600">{(q as ClassifiedQuestion).discipline || '—'}</span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function AddExamPanel() {
  const [step, setStep] = useState<Step>('upload')
  const [examNumber, setExamNumber] = useState('')
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [examDate, setExamDate] = useState('')
  const [examFile, setExamFile] = useState<File | null>(null)
  const [gabaritoFile, setGabaritoFile] = useState<File | null>(null)
  const [questions, setQuestions] = useState<ParsedQuestion[]>([])
  const [classified, setClassified] = useState<ClassifiedQuestion[]>([])
  const [classifyProgress, setClassifyProgress] = useState(0)
  const [savedId, setSavedId] = useState('')
  const [error, setError] = useState('')

  // ── Step 1: Extract ──────────────────────────────────────────────────────────
  async function handleExtract() {
    setError('')
    setStep('extracting')

    const fd = new FormData()
    fd.append('examNumber', examNumber)
    fd.append('year', year)
    fd.append('examDate', examDate)
    fd.append('examPdf', examFile!)
    fd.append('gabaritoPdf', gabaritoFile!)

    const result = await extractExamFromFiles(fd)
    if ('error' in result) {
      setError(result.error)
      setStep('upload')
      return
    }

    setQuestions(result.data.questions)
    setStep('review')
    toast.success(`${result.data.questions.length} questões extraídas com sucesso`)
  }

  // ── Step 2: Classify ─────────────────────────────────────────────────────────
  async function handleClassify() {
    setStep('classifying')
    setClassifyProgress(0)

    // Classify in chunks of 10, updating progress as we go
    const BATCH = 10
    const result: ClassifiedQuestion[] = []
    for (let i = 0; i < questions.length; i += BATCH) {
      const batch = questions.slice(i, i + BATCH)
      const res = await classifyQuestions(batch)
      result.push(...res)
      setClassifyProgress(Math.round(((i + BATCH) / questions.length) * 100))
    }

    setClassified(result)
    const withDiscipline = result.filter(q => q.discipline).length
    toast.success(`${withDiscipline}/${result.length} questões classificadas`)
    setStep('review') // go back to review with classified data shown
  }

  // ── Step 3: Save ──────────────────────────────────────────────────────────────
  async function handleSave(useClassified: boolean) {
    setStep('saving')
    const questionsToSave = useClassified && classified.length > 0
      ? classified
      : questions.map(q => ({ ...q, discipline: '', subtheme: '' }))

    const result = await saveExam({
      examNumber: parseInt(examNumber),
      year: parseInt(year),
      examDate,
      questions: questionsToSave as ClassifiedQuestion[],
    })

    if ('error' in result || !result.data) {
      setError(result.error ?? 'Erro desconhecido')
      setStep('review')
      return
    }

    setSavedId(result.data.examId)
    setStep('done')
    toast.success(`${result.data.count} questões salvas no banco`)
  }

  function reset() {
    setStep('upload'); setExamNumber(''); setYear(new Date().getFullYear().toString())
    setExamDate(''); setExamFile(null); setGabaritoFile(null)
    setQuestions([]); setClassified([]); setClassifyProgress(0)
    setSavedId(''); setError('')
  }

  const displayQuestions = classified.length > 0 ? classified : questions

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <StepBar current={step} />

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* ── UPLOAD ───────────────────────────────────────────────────────────── */}
      {(step === 'upload' || step === 'extracting') && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Número da Prova</Label>
              <Input
                type="number" placeholder="Ex: 40" min={1}
                value={examNumber} onChange={e => setExamNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Ano</Label>
              <Input
                type="number" placeholder="2025" min={1990}
                value={year} onChange={e => setYear(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Data da Prova (opcional)</Label>
              <Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FileInput label="PDF da Prova" id="examPdf" file={examFile} onChange={setExamFile} />
            <FileInput label="PDF do Gabarito" id="gabaritoPdf" file={gabaritoFile} onChange={setGabaritoFile} />
          </div>

          <p className="text-xs text-gray-400">
            O PDF deve conter texto selecionável (não pode ser imagem escaneada).
          </p>

          <Button
            onClick={handleExtract}
            disabled={step === 'extracting' || !examFile || !gabaritoFile || !examNumber || !year}
            className="w-full"
          >
            {step === 'extracting'
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extraindo questões com IA…</>
              : <><FileText className="w-4 h-4 mr-2" /> Extrair Questões</>}
          </Button>
        </div>
      )}

      {/* ── REVIEW ───────────────────────────────────────────────────────────── */}
      {step === 'review' && displayQuestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">
                OAB Exame {examNumber} — {year}
              </p>
              <p className="text-xs text-gray-400">
                {displayQuestions.length} questões extraídas
                {classified.length > 0 && ` · ${classified.filter(q => q.discipline).length} classificadas`}
                {' · '}{questions.filter(q => q.correctAnswer).length} com resposta
              </p>
            </div>
            <div className="flex gap-2">
              {classified.length === 0 && (
                <Button variant="outline" size="sm" onClick={handleClassify}>
                  <Brain className="w-4 h-4 mr-1" /> Classificar com IA
                </Button>
              )}
              <Button size="sm" onClick={() => handleSave(classified.length > 0)}>
                <Database className="w-4 h-4 mr-1" />
                {classified.length > 0 ? 'Salvar com Classificação' : 'Salvar sem Classificar'}
              </Button>
            </div>
          </div>

          <QuestionsTable questions={displayQuestions} />

          <p className="text-xs text-gray-400">
            Clique em uma questão para ver o enunciado completo e as alternativas.
          </p>
        </div>
      )}

      {/* ── CLASSIFYING ──────────────────────────────────────────────────────── */}
      {step === 'classifying' && (
        <div className="space-y-4 py-8 text-center">
          <Brain className="w-10 h-10 mx-auto text-blue-500 animate-pulse" />
          <p className="font-medium text-gray-700">Classificando questões com IA…</p>
          <p className="text-sm text-gray-400">{classifyProgress}% concluído</p>
          <Progress value={classifyProgress} className="max-w-xs mx-auto" />
        </div>
      )}

      {/* ── SAVING ───────────────────────────────────────────────────────────── */}
      {step === 'saving' && (
        <div className="py-8 text-center space-y-3">
          <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin" />
          <p className="font-medium text-gray-700">Salvando no banco de dados…</p>
        </div>
      )}

      {/* ── DONE ─────────────────────────────────────────────────────────────── */}
      {step === 'done' && (
        <div className="py-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
          <div>
            <p className="text-lg font-semibold text-gray-900">Prova incluída com sucesso!</p>
            <p className="text-sm text-gray-500 mt-1">
              OAB {examNumber} ({year}) — {questions.length} questões salvas
              {classified.length > 0 && ` com classificação por disciplina`}.
            </p>
          </div>
          <Button onClick={reset} variant="outline">
            Incluir outra prova
          </Button>
        </div>
      )}
    </div>
  )
}
