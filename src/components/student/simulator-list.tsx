'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ClipboardList, Clock, Play, Trophy } from 'lucide-react'
import { formatPercent, formatDate } from '@/lib/utils'
import { SimulationRunner } from './simulation-runner'

type Simulation = {
  id: string
  name: string
  type: string
  totalQuestions: number
  timeLimitMinutes: number | null
  isAdaptive: boolean
}

type CompletedSim = {
  id: string
  simulationId: string
  percentage: number
  totalCorrect: number
  totalAnswered: number
  startedAt: Date
}

interface SimulatorListProps {
  simulations: Simulation[]
  completed: CompletedSim[]
  subjects: Array<{ id: string; name: string }>
  userId: string
}

const TYPE_LABELS: Record<string, string> = {
  general: 'Geral',
  subject: 'Por disciplina',
  topic: 'Por assunto',
  predicted: 'Previstos',
  adaptive: 'Adaptativo',
}

export function SimulatorList({ simulations, completed, subjects, userId }: SimulatorListProps) {
  const [selectedSim, setSelectedSim] = useState<Simulation | null>(null)
  const [running, setRunning] = useState(false)

  const completedMap = new Map(completed.map(c => [c.simulationId, c]))

  if (running && selectedSim) {
    return (
      <SimulationRunner
        simulation={selectedSim}
        userId={userId}
        onComplete={() => {
          setRunning(false)
          setSelectedSim(null)
          window.location.reload()
        }}
        onExit={() => {
          setRunning(false)
          setSelectedSim(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Available Simulations */}
      {simulations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum simulado disponível ainda</p>
            <p className="text-gray-400 text-sm mt-1">
              Os simulados são criados pelos administradores
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {simulations.map(sim => {
            const completedResult = completedMap.get(sim.id)
            const passed = completedResult && completedResult.percentage >= 0.6

            return (
              <Card key={sim.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">{sim.name}</CardTitle>
                    {completedResult && (
                      <Badge className={passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {formatPercent(completedResult.percentage)}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="w-fit text-xs">
                    {TYPE_LABELS[sim.type] || sim.type}
                  </Badge>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <ClipboardList className="w-3.5 h-3.5" />
                      {sim.totalQuestions} questões
                    </span>
                    {sim.timeLimitMinutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {sim.timeLimitMinutes} min
                      </span>
                    )}
                    {sim.isAdaptive && (
                      <Badge variant="secondary" className="text-xs">Adaptativo</Badge>
                    )}
                  </div>

                  {completedResult && (
                    <div className="text-xs text-gray-400">
                      Última tentativa: {formatDate(completedResult.startedAt)} ·{' '}
                      {completedResult.totalCorrect}/{completedResult.totalAnswered}
                    </div>
                  )}

                  <Button
                    className="mt-auto"
                    onClick={() => {
                      setSelectedSim(sim)
                      setRunning(true)
                    }}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {completedResult ? 'Refazer' : 'Iniciar'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Recent Results */}
      {completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Histórico de Simulados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completed.map(result => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                >
                  <div>
                    <p className="font-medium text-gray-700">
                      {result.totalAnswered} questões
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(result.startedAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600">
                      {result.totalCorrect}/{result.totalAnswered}
                    </span>
                    <Badge className={
                      result.percentage >= 0.6
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }>
                      {formatPercent(result.percentage)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
