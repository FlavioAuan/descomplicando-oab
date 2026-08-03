'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, XCircle, RotateCcw, Brain } from 'lucide-react'
import { reviewFlashcard } from '@/server/actions/student'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Flashcard {
  id: string
  front: string
  back: string
  difficulty: string | null
  subject: string | null
}

interface FlashcardStudyProps {
  cards: Flashcard[]
  userId: string
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

export function FlashcardStudy({ cards, userId }: FlashcardStudyProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState<Record<string, boolean>>({})
  const [finished, setFinished] = useState(false)

  const current = cards[currentIndex]
  const progress = (currentIndex / cards.length) * 100

  async function handleResult(correct: boolean) {
    if (!current) return

    setResults(prev => ({ ...prev, [current.id]: correct }))

    await reviewFlashcard({ flashcardId: current.id, correct })

    if (currentIndex + 1 >= cards.length) {
      setFinished(true)
    } else {
      setCurrentIndex(i => i + 1)
      setFlipped(false)
    }

    toast.success(correct ? '+5 XP!' : 'Anotado no caderno de erros', {
      duration: 1500,
    })
  }

  function restart() {
    setCurrentIndex(0)
    setFlipped(false)
    setResults({})
    setFinished(false)
  }

  if (cards.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Brain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum flashcard disponível</p>
          <p className="text-gray-400 text-sm mt-1">
            Os flashcards são gerados automaticamente com base nos seus estudos
          </p>
        </CardContent>
      </Card>
    )
  }

  if (finished) {
    const correctCount = Object.values(results).filter(Boolean).length
    const percentage = (correctCount / cards.length) * 100

    return (
      <Card>
        <CardContent className="py-12 text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Sessão concluída!</h2>
            <p className="text-gray-500 mt-1">{cards.length} flashcards revisados</p>
          </div>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{correctCount}</div>
              <div className="text-sm text-gray-500">Acertos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-500">{cards.length - correctCount}</div>
              <div className="text-sm text-gray-500">Para rever</div>
            </div>
          </div>
          <Button onClick={restart} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reiniciar
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!current) return null

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <Progress value={progress} className="flex-1 h-2" />
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {currentIndex + 1}/{cards.length}
        </span>
      </div>

      {/* Flashcard */}
      <div
        className="cursor-pointer select-none"
        style={{ perspective: '1000px' }}
        onClick={() => setFlipped(f => !f)}
      >
        <div
          className="relative transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)',
            minHeight: '280px',
          }}
        >
          {/* Front */}
          <Card
            className="absolute inset-0"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <CardContent className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="flex gap-2 mb-4">
                {current.subject && (
                  <Badge variant="outline" className="text-xs">{current.subject}</Badge>
                )}
                {current.difficulty && (
                  <Badge className={cn('text-xs', DIFFICULTY_COLORS[current.difficulty])}>
                    {current.difficulty}
                  </Badge>
                )}
              </div>
              <p className="text-lg font-medium text-gray-800 leading-relaxed">
                {current.front}
              </p>
              <p className="text-sm text-gray-400 mt-6">Clique para ver a resposta</p>
            </CardContent>
          </Card>

          {/* Back */}
          <Card
            className="absolute inset-0 bg-blue-50 border-blue-200"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <CardContent className="h-full flex flex-col items-center justify-center p-8 text-center">
              <p className="text-base text-gray-700 leading-relaxed">{current.back}</p>
              <p className="text-sm text-blue-400 mt-6">Como você foi?</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Answer Buttons */}
      {flipped && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => handleResult(false)}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Errei / Rever
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleResult(true)}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Acertei!
          </Button>
        </div>
      )}
    </div>
  )
}
