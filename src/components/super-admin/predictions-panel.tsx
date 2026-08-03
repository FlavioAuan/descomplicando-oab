'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Prediction {
  id: string
  rank: number
  probability: number | null
  frequencyHistorical: number | null
  frequencyRecent: number | null
  trend: string | null
  justification: string | null
  generatedAt: Date
  generatedForExam: number | null
}

interface PredictionsPanelProps {
  predictions: Prediction[]
}

const TREND_ICONS = {
  growing: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
}

const TREND_COLORS = {
  growing: 'text-green-600',
  stable: 'text-gray-500',
  declining: 'text-red-500',
}

export function PredictionsPanel({ predictions: initialPredictions }: PredictionsPanelProps) {
  const [predictions, setPredictions] = useState(initialPredictions)
  const [generating, setGenerating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function generateNewPredictions() {
    setGenerating(true)
    toast.info('Analisando dados históricos com IA...')

    try {
      const response = await fetch('/api/predictions', { method: 'POST' })
      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
      } else {
        toast.success(`Previsões geradas para o ${data.generatedFor}!`)
        window.location.reload()
      }
    } catch {
      toast.error('Erro ao gerar previsões')
    } finally {
      setGenerating(false)
    }
  }

  const probToPercent = (p: number | null) => ((p || 0) * 100).toFixed(0)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {predictions.length > 0 && (
          <p className="text-sm text-gray-500">
            Gerado em {new Date(predictions[0].generatedAt).toLocaleDateString('pt-BR')}
            {predictions[0].generatedForExam && ` · Para o ${predictions[0].generatedForExam}º Exame`}
          </p>
        )}
        <Button onClick={generateNewPredictions} disabled={generating} className="ml-auto">
          {generating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Brain className="w-4 h-4 mr-2" />
          )}
          {generating ? 'Gerando...' : 'Gerar Novas Previsões'}
        </Button>
      </div>

      {predictions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Brain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma previsão gerada ainda</p>
            <p className="text-gray-400 text-sm mt-1">
              Clique em "Gerar Novas Previsões" para analisar os dados históricos
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {predictions.map((pred) => {
            const TrendIcon = TREND_ICONS[pred.trend as keyof typeof TREND_ICONS] || Minus
            const trendColor = TREND_COLORS[pred.trend as keyof typeof TREND_COLORS] || 'text-gray-500'
            const isExpanded = expandedId === pred.id

            return (
              <Card
                key={pred.id}
                className={cn(
                  'cursor-pointer transition-shadow hover:shadow-md',
                  pred.rank <= 10 && 'border-blue-200'
                )}
                onClick={() => setExpandedId(isExpanded ? null : pred.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0',
                      pred.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                      pred.rank <= 3 ? 'bg-orange-100 text-orange-700' :
                      pred.rank <= 10 ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    )}>
                      #{pred.rank}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800 truncate">
                          Tema #{pred.rank}
                        </p>
                        <TrendIcon className={cn('w-4 h-4 flex-shrink-0', trendColor)} />
                      </div>
                      {pred.justification && (
                        <p className={cn(
                          'text-xs text-gray-500 mt-0.5',
                          !isExpanded && 'truncate'
                        )}>
                          {pred.justification}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {probToPercent(pred.probability)}%
                        </div>
                        <div className="text-xs text-gray-400">probabilidade</div>
                      </div>
                      <div className="text-center hidden md:block">
                        <div className="text-sm font-medium text-gray-600">
                          {probToPercent(pred.frequencyHistorical)}%
                        </div>
                        <div className="text-xs text-gray-400">histórico</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
