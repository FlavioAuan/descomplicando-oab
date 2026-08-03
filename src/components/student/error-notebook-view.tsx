'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { CheckCircle, XCircle, Clock, BookOpen } from 'lucide-react'
import { submitAnswer } from '@/server/actions/student'
import { formatDate, cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ErrorEntry {
  id: string
  questionId: string
  errorAnswer: string
  correctAnswer: string
  reviewCount: number
  nextReviewAt: Date | null
  createdAt: Date
  statement: string
  alternatives: { a: string; b: string; c: string; d: string }
  subjectName: string | null
}

interface ErrorNotebookViewProps {
  due: ErrorEntry[]
  upcoming: ErrorEntry[]
}

export function ErrorNotebookView({ due, upcoming }: ErrorNotebookViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [submitted, setSubmitted] = useState(false)
  const [reviewed, setReviewed] = useState<Set<string>>(new Set())

  const unreviewed = due.filter(e => !reviewed.has(e.id))
  const current = unreviewed[currentIndex]

  async function handleSubmit() {
    if (!selectedAnswer || !current) return

    const isCorrect = selectedAnswer === current.correctAnswer
    setSubmitted(true)

    await submitAnswer({
      questionId: current.questionId,
      answer: selectedAnswer,
      correctAnswer: current.correctAnswer,
    })

    if (isCorrect) {
      toast.success('Correto! Movendo para próxima revisão...')
    }
  }

  function next() {
    if (current) setReviewed(prev => new Set([...prev, current.id]))
    setCurrentIndex(i => i + 1)
    setShowAnswer(false)
    setSelectedAnswer('')
    setSubmitted(false)
  }

  if (due.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Tudo em dia!</p>
          <p className="text-gray-400 text-sm mt-1">
            Nenhuma revisão pendente para agora
          </p>
          {upcoming.length > 0 && (
            <p className="text-gray-400 text-sm mt-3">
              {upcoming.length} revisões programadas para os próximos dias
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  if (!current) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-green-600 font-medium text-lg">Sessão concluída!</p>
          <p className="text-gray-500 mt-1">{due.length} questões revisadas</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{currentIndex + 1} de {unreviewed.length} revisões</span>
        <span>{reviewed.size} concluídas</span>
      </div>

      {/* Question */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap">
            {current.subjectName && (
              <Badge variant="outline" className="text-xs">{current.subjectName}</Badge>
            )}
            <Badge className="bg-orange-100 text-orange-700 text-xs">
              Revisão #{current.reviewCount + 1}
            </Badge>
            <Badge className="bg-red-100 text-red-700 text-xs">
              Seu erro: {current.errorAnswer.toUpperCase()}
            </Badge>
          </div>
          <p className="text-gray-800 leading-relaxed mt-2">{current.statement}</p>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedAnswer}
            onValueChange={setSelectedAnswer}
            disabled={submitted}
          >
            {(['a', 'b', 'c', 'd'] as const).map(option => {
              const isCorrect = submitted && current.correctAnswer === option
              const isWrong = submitted && selectedAnswer === option && current.correctAnswer !== option

              return (
                <div
                  key={option}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border',
                    isCorrect && 'border-green-300 bg-green-50',
                    isWrong && 'border-red-300 bg-red-50',
                    !submitted && 'hover:bg-gray-50'
                  )}
                >
                  <RadioGroupItem value={option} id={`rev-${option}`} className="mt-0.5" />
                  <Label htmlFor={`rev-${option}`} className="cursor-pointer text-gray-700">
                    <span className="font-semibold mr-2">{option.toUpperCase()})</span>
                    {current.alternatives[option]}
                  </Label>
                  {isCorrect && <CheckCircle className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />}
                  {isWrong && <XCircle className="w-4 h-4 text-red-500 ml-auto flex-shrink-0" />}
                </div>
              )
            })}
          </RadioGroup>

          <div className="flex gap-3 mt-4">
            {!submitted ? (
              <Button
                onClick={handleSubmit}
                disabled={!selectedAnswer}
                className="flex-1"
              >
                Confirmar resposta
              </Button>
            ) : (
              <Button onClick={next} className="flex-1">
                Próxima questão →
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Reviews */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Próximas Revisões ({upcoming.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcoming.slice(0, 5).map(entry => (
                <div key={entry.id} className="flex items-center justify-between text-sm">
                  <p className="text-gray-600 truncate flex-1 mr-2">
                    {entry.statement.substring(0, 80)}...
                  </p>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {entry.nextReviewAt ? formatDate(entry.nextReviewAt) : 'Agendado'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
