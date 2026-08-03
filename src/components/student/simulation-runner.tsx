'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Clock, ChevronLeft, ChevronRight, CheckCircle, XCircle, X } from 'lucide-react'
import { submitAnswer, completeSimulation } from '@/server/actions/student'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Question {
  id: string
  number: number
  statement: string
  alternatives: { a: string; b: string; c: string; d: string }
  correctAnswer?: string
}

interface SimulationRunnerProps {
  simulation: {
    id: string
    name: string
    totalQuestions: number
    timeLimitMinutes: number | null
  }
  userId: string
  onComplete: () => void
  onExit: () => void
}

export function SimulationRunner({
  simulation,
  userId,
  onComplete,
  onExit,
}: SimulationRunnerProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [studentSimId, setStudentSimId] = useState<string>('')
  const [timeLeft, setTimeLeft] = useState(simulation.timeLimitMinutes
    ? simulation.timeLimitMinutes * 60
    : null)
  const [result, setResult] = useState<{
    score: number
    percentage: number
    totalCorrect: number
    totalAnswered: number
  } | null>(null)

  useEffect(() => {
    loadQuestions()
  }, [])

  useEffect(() => {
    if (!timeLeft) return
    if (timeLeft <= 0) {
      finishSimulation()
      return
    }

    const timer = setInterval(() => setTimeLeft(t => (t || 0) - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  async function loadQuestions() {
    try {
      const res = await fetch(`/api/simulations/${simulation.id}/questions`)
      const data = await res.json()
      setQuestions(data.questions)
      setStudentSimId(data.studentSimulationId)
    } catch {
      toast.error('Erro ao carregar questões')
    } finally {
      setLoading(false)
    }
  }

  async function handleAnswer(answer: string) {
    const question = questions[currentIndex]
    if (!question || submitted[question.id]) return

    setAnswers(prev => ({ ...prev, [question.id]: answer }))
    setSubmitted(prev => ({ ...prev, [question.id]: true }))

    await submitAnswer({
      questionId: question.id,
      answer,
      correctAnswer: question.correctAnswer || 'a',
      studentSimulationId: studentSimId,
    })
  }

  async function finishSimulation() {
    if (completing) return
    setCompleting(true)

    try {
      const result = await completeSimulation(studentSimId)
      setResult(result)
    } catch {
      toast.error('Erro ao finalizar simulado')
    } finally {
      setCompleting(false)
    }
  }

  const current = questions[currentIndex]
  const progressPercent = (Object.keys(answers).length / simulation.totalQuestions) * 100

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-20 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500">Carregando questões...</p>
        </CardContent>
      </Card>
    )
  }

  if (result) {
    const passed = result.percentage >= 0.6
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-6">
          <div className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center mx-auto',
            passed ? 'bg-green-100' : 'bg-red-100'
          )}>
            {passed ? (
              <CheckCircle className="w-10 h-10 text-green-600" />
            ) : (
              <XCircle className="w-10 h-10 text-red-600" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {passed ? 'Parabéns! Aprovado!' : 'Continue praticando!'}
            </h2>
            <p className="text-gray-500 mt-1">{simulation.name}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-800">
                {(result.percentage * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Aproveitamento</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-600">{result.totalCorrect}</div>
              <div className="text-xs text-gray-500 mt-1">Acertos</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-red-500">
                {result.totalAnswered - result.totalCorrect}
              </div>
              <div className="text-xs text-gray-500 mt-1">Erros</div>
            </div>
          </div>
          <Button onClick={onComplete} size="lg">
            Voltar aos Simulados
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!current) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-900">{simulation.name}</h1>
          <p className="text-sm text-gray-500">
            Questão {currentIndex + 1} de {questions.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {timeLeft !== null && (
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-medium',
              timeLeft < 300 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'
            )}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={onExit}>
            <X className="w-4 h-4 mr-1" /> Sair
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <Progress value={progressPercent} className="h-2" />
        <p className="text-xs text-gray-400 text-right">
          {Object.keys(answers).length} respondidas
        </p>
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit mb-2">
            Questão {current.number}
          </Badge>
          <p className="text-gray-800 leading-relaxed">{current.statement}</p>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={answers[current.id] || ''}
            onValueChange={handleAnswer}
            disabled={!!submitted[current.id]}
          >
            {(['a', 'b', 'c', 'd'] as const).map(option => {
              const isSelected = answers[current.id] === option
              const isCorrect = submitted[current.id] && current.correctAnswer === option
              const isWrong = submitted[current.id] && isSelected && current.correctAnswer !== option

              return (
                <div
                  key={option}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                    isCorrect && 'border-green-300 bg-green-50',
                    isWrong && 'border-red-300 bg-red-50',
                    !submitted[current.id] && 'hover:bg-gray-50',
                    isSelected && !submitted[current.id] && 'border-blue-300 bg-blue-50'
                  )}
                >
                  <RadioGroupItem value={option} id={option} className="mt-0.5" />
                  <Label
                    htmlFor={option}
                    className="cursor-pointer leading-relaxed text-gray-700"
                  >
                    <span className="font-semibold uppercase mr-2">{option})</span>
                    {current.alternatives[option]}
                  </Label>
                  {isCorrect && <CheckCircle className="w-4 h-4 text-green-500 ml-auto mt-0.5 flex-shrink-0" />}
                  {isWrong && <XCircle className="w-4 h-4 text-red-500 ml-auto mt-0.5 flex-shrink-0" />}
                </div>
              )
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
        </Button>

        <div className="flex gap-2">
          {currentIndex < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
            >
              Próxima <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={finishSimulation}
              disabled={completing}
              className="bg-green-600 hover:bg-green-700"
            >
              {completing ? 'Finalizando...' : 'Finalizar Simulado'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
