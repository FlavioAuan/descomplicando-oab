'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { saveExerciseProgress } from '@/server/actions/exercises'
import type { ExerciseQuestion } from '@/server/actions/exercises'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, ChevronRight, Trophy, RotateCcw, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const LETTER = ['A', 'B', 'C', 'D'] as const
const KEYS = ['a', 'b', 'c', 'd'] as const

interface Props {
  setId: string
  title: string
  questions: ExerciseQuestion[]
}

type Phase = 'playing' | 'review' | 'results'

export function ExercisePlayer({ setId, title, questions }: Props) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('playing')
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const q = questions[current]
  const total = questions.length
  const isLast = current === total - 1

  function handleSelect(key: string) {
    if (confirmed) return
    setSelected(key)
  }

  function handleConfirm() {
    if (!selected) return
    const newAnswers = { ...answers, [q.id]: selected }
    setAnswers(newAnswers)
    setConfirmed(true)
  }

  function handleNext() {
    if (isLast) {
      finishExercise()
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setConfirmed(false)
    }
  }

  async function finishExercise() {
    const totalCorrect = questions.filter(q => answers[q.id] === q.correctAnswer).length
    await saveExerciseProgress(setId, answers, totalCorrect, total)
    setPhase('results')
  }

  function restart() {
    setAnswers({})
    setSelected(null)
    setConfirmed(false)
    setCurrent(0)
    setPhase('playing')
  }

  const totalCorrect = questions.filter(q => answers[q.id] === q.correctAnswer).length
  const pct = Math.round((totalCorrect / total) * 100)

  // ── Results screen ──────────────────────────────────────────────────────────
  if (phase === 'results') {
    return (
      <div className="space-y-6">
        {/* Score card */}
        <div className="bg-white rounded-2xl border shadow-sm p-8 text-center space-y-4">
          <Trophy className={cn('w-14 h-14 mx-auto', pct >= 70 ? 'text-yellow-400' : 'text-gray-300')} />
          <div>
            <p className="text-4xl font-bold text-gray-900">{pct}%</p>
            <p className="text-gray-500 mt-1">{totalCorrect} de {total} questões corretas</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className={cn('h-3 rounded-full transition-all', pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400')}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">
            {pct >= 70 ? '🎉 Excelente! Você domina este conteúdo.' : pct >= 50 ? '📚 Bom resultado! Revise os erros.' : '💪 Continue praticando!'}
          </p>
        </div>

        {/* Question review */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">Revisão das questões</h2>
          {questions.map((q, i) => {
            const userAnswer = answers[q.id]
            const correct = userAnswer === q.correctAnswer
            return (
              <div key={q.id} className={cn('bg-white rounded-xl border p-5 space-y-3', correct ? 'border-green-200' : 'border-red-200')}>
                <div className="flex items-start gap-3">
                  {correct
                    ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                  <p className="text-sm text-gray-800 font-medium">Q{i + 1}. {q.statement}</p>
                </div>
                <div className="grid grid-cols-1 gap-1.5 pl-8">
                  {KEYS.map((k, ki) => (
                    <div
                      key={k}
                      className={cn(
                        'flex items-start gap-2 rounded-lg px-3 py-2 text-sm',
                        k === q.correctAnswer ? 'bg-green-50 text-green-800 font-medium' : '',
                        k === userAnswer && k !== q.correctAnswer ? 'bg-red-50 text-red-700 line-through' : '',
                      )}
                    >
                      <span className="font-bold flex-shrink-0">{LETTER[ki]}.</span>
                      {q.alternatives[k]}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <p className="pl-8 text-xs text-gray-500 border-t pt-2">{q.explanation}</p>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <Button onClick={restart} variant="outline" className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Refazer
          </Button>
        </div>
      </div>
    )
  }

  // ── Playing screen ──────────────────────────────────────────────────────────
  const isCorrect = confirmed && selected === q.correctAnswer

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Questão {current + 1} de {total}</span>
          <span>{Math.round((current / total) * 100)}% concluído</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="h-2 bg-blue-500 rounded-full transition-all"
            style={{ width: `${(current / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-5">
        <p className="text-gray-800 font-medium leading-relaxed">{q.statement}</p>

        <div className="space-y-2.5">
          {KEYS.map((k, ki) => {
            let variant = 'default'
            if (confirmed) {
              if (k === q.correctAnswer) variant = 'correct'
              else if (k === selected) variant = 'wrong'
            } else if (k === selected) {
              variant = 'selected'
            }

            return (
              <button
                key={k}
                type="button"
                onClick={() => handleSelect(k)}
                disabled={confirmed}
                className={cn(
                  'w-full flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-all',
                  variant === 'default' && 'border-gray-200 hover:border-blue-300 hover:bg-blue-50',
                  variant === 'selected' && 'border-blue-500 bg-blue-50',
                  variant === 'correct' && 'border-green-500 bg-green-50 text-green-800',
                  variant === 'wrong' && 'border-red-400 bg-red-50 text-red-700',
                )}
              >
                <span className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                  variant === 'default' && 'bg-gray-100 text-gray-500',
                  variant === 'selected' && 'bg-blue-500 text-white',
                  variant === 'correct' && 'bg-green-500 text-white',
                  variant === 'wrong' && 'bg-red-400 text-white',
                )}>
                  {LETTER[ki]}
                </span>
                <span className="leading-relaxed">{q.alternatives[k]}</span>
                {confirmed && k === q.correctAnswer && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5 ml-auto" />}
                {confirmed && k === selected && k !== q.correctAnswer && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5 ml-auto" />}
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {confirmed && q.explanation && (
          <div className={cn('rounded-xl p-4 text-sm', isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800')}>
            <p className="font-semibold mb-1">{isCorrect ? '✓ Correto!' : '✗ Incorreto'}</p>
            <p>{q.explanation}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        {!confirmed ? (
          <Button onClick={handleConfirm} disabled={!selected}>
            Confirmar resposta
          </Button>
        ) : (
          <Button onClick={handleNext} className="flex items-center gap-2">
            {isLast ? 'Ver resultado' : 'Próxima questão'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
