'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, XCircle, RotateCcw, Brain } from 'lucide-react'
import type { FlashcardCard } from '@/server/actions/flashcard-sets'

// Study a flashcard set from a training activity. Results stay on the page:
// set cards are not tied to the spaced-repetition table used by /student/flashcards.
export function FlashcardDeck({ cards }: { cards: FlashcardCard[] }) {
  const [deck, setDeck] = useState(cards)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [missed, setMissed] = useState<FlashcardCard[]>([])
  const [knownCount, setKnownCount] = useState(0)

  const finished = index >= deck.length
  const current = deck[index]

  function answer(known: boolean) {
    if (known) setKnownCount(c => c + 1)
    else setMissed(m => [...m, current])
    setFlipped(false)
    setIndex(i => i + 1)
  }

  function restart(cardsToStudy: FlashcardCard[]) {
    setDeck(cardsToStudy)
    setIndex(0)
    setFlipped(false)
    setMissed([])
    setKnownCount(0)
  }

  if (finished) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-4">
          <Brain className="w-10 h-10 text-blue-500 mx-auto" />
          <div>
            <p className="text-lg font-semibold text-gray-800">Rodada concluída</p>
            <p className="text-sm text-gray-500 mt-1">
              Você sabia {knownCount} de {deck.length} cards
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {missed.length > 0 && (
              <Button onClick={() => restart(missed)}>
                <RotateCcw className="w-4 h-4 mr-2" /> Revisar os {missed.length} que errei
              </Button>
            )}
            <Button variant="outline" onClick={() => restart(cards)}>
              Recomeçar todos
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>Card {index + 1} de {deck.length}</span>
        <Progress value={(index / deck.length) * 100} className="h-2 flex-1" />
      </div>

      <button
        type="button"
        onClick={() => setFlipped(f => !f)}
        className="w-full text-left"
      >
        <Card className={flipped ? 'border-blue-300 bg-blue-50' : ''}>
          <CardContent className="min-h-[200px] p-8 flex flex-col items-center justify-center text-center gap-3">
            <span className="text-xs uppercase tracking-wide text-gray-400">
              {flipped ? 'Resposta' : 'Pergunta'}
            </span>
            <p className="text-lg text-gray-800 leading-relaxed">{flipped ? current.back : current.front}</p>
            {!flipped && <span className="text-xs text-gray-400">Clique para ver a resposta</span>}
          </CardContent>
        </Card>
      </button>

      {flipped && (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => answer(false)}>
            <XCircle className="w-4 h-4 mr-2" /> Errei
          </Button>
          <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => answer(true)}>
            <CheckCircle className="w-4 h-4 mr-2" /> Acertei
          </Button>
        </div>
      )}
    </div>
  )
}
