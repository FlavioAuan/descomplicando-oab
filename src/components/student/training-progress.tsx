import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckCircle, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface TrainingProgressProps {
  progress: {
    id: string
    trainingId: string
    currentDay: number
    completedTopics: string[] | null
    startedAt: Date | null
    lastAccessedAt: Date | null
    trainingName: string
    trainingDays: number
    trainingHours: number
  }
  userId: string
}

export function TrainingProgress({ progress }: TrainingProgressProps) {
  const completedCount = progress.completedTopics?.length || 0
  const dayProgress = (progress.currentDay / progress.trainingDays) * 100

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg text-blue-900">{progress.trainingName}</CardTitle>
              <p className="text-sm text-blue-600 mt-1">
                Dia {progress.currentDay} de {progress.trainingDays}
              </p>
            </div>
            <Badge className="bg-blue-600 text-white">Em andamento</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-blue-700 mb-2">
              <span>Progresso geral</span>
              <span>{dayProgress.toFixed(0)}%</span>
            </div>
            <Progress value={dayProgress} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white rounded-lg p-3">
              <div className="text-lg font-bold text-blue-700">{progress.currentDay}</div>
              <div className="text-xs text-gray-500">Dia atual</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-lg font-bold text-green-600">{completedCount}</div>
              <div className="text-xs text-gray-500">Tópicos feitos</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-lg font-bold text-gray-600">{progress.trainingHours}h</div>
              <div className="text-xs text-gray-500">Por dia</div>
            </div>
          </div>

          {progress.lastAccessedAt && (
            <p className="text-xs text-blue-400 text-center">
              Último acesso: {formatDate(progress.lastAccessedAt)}
            </p>
          )}

          <Link href={`/student/training/${progress.trainingId}`}>
            <Button className="w-full">
              Continuar estudando →
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
