'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Zap, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ClassifyPanelProps {
  total: number
  classified: number
  unclassified: number
}

export function ClassifyPanel({ total, classified, unclassified }: ClassifyPanelProps) {
  const [loading, setLoading] = useState(false)
  const [batchSize, setBatchSize] = useState(20)
  const [progress, setProgress] = useState({ classified, total })

  const classificationRate = total > 0 ? (progress.classified / progress.total) * 100 : 0

  async function runClassification() {
    setLoading(true)

    try {
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: batchSize }),
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
      } else {
        setProgress(prev => ({
          classified: prev.classified + data.classified,
          total: prev.total,
        }))
        toast.success(`${data.classified} questões classificadas!`)
      }
    } catch {
      toast.error('Erro ao classificar questões')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-gray-800">{progress.total}</div>
            <div className="text-sm text-gray-500">Total de questões</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600">{progress.classified}</div>
            <div className="text-sm text-gray-500">Classificadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-orange-500">{progress.total - progress.classified}</div>
            <div className="text-sm text-gray-500">Pendentes</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-yellow-500" />
            Classificação Automática com IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Progresso da classificação</span>
              <span className="text-sm font-medium">{classificationRate.toFixed(1)}%</span>
            </div>
            <Progress value={classificationRate} className="h-3" />
          </div>

          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="batchSize">Questões por lote</Label>
              <Input
                id="batchSize"
                type="number"
                min="1"
                max="100"
                value={batchSize}
                onChange={e => setBatchSize(parseInt(e.target.value) || 20)}
                className="w-32"
              />
            </div>
            <Button
              onClick={runClassification}
              disabled={loading || progress.classified >= progress.total}
              size="lg"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : progress.classified >= progress.total ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              {loading
                ? 'Classificando...'
                : progress.classified >= progress.total
                ? 'Tudo classificado!'
                : `Classificar ${batchSize} questões`}
            </Button>
          </div>

          <p className="text-xs text-gray-400">
            O Claude classificará as questões por Disciplina, Subtema e Microtema automaticamente.
            Execute em lotes para evitar timeout.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
