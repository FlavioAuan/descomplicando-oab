'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { completeTrainingTopic } from '@/server/actions/student'
import { GraduationCap, Calendar, Clock, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { Training } from '@/types'

interface AvailableTrainingsProps {
  trainings: Training[]
  userId: string
}

export function AvailableTrainings({ trainings, userId }: AvailableTrainingsProps) {
  const [enrolling, setEnrolling] = useState<string | null>(null)

  async function enroll(trainingId: string) {
    setEnrolling(trainingId)
    // Enroll by completing first topic (creates progress record)
    await completeTrainingTopic({ trainingId, topicId: 'enroll' })
    toast.success('Treinamento iniciado!')
    window.location.reload()
    setEnrolling(null)
  }

  if (trainings.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum treinamento disponível</p>
          <p className="text-gray-400 text-sm mt-1">
            Aguarde a publicação de treinamentos pelos administradores
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Treinamentos Disponíveis</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trainings.map(training => (
          <Card key={training.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{training.name}</CardTitle>
              {training.description && (
                <p className="text-sm text-gray-500 line-clamp-2">{training.description}</p>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{training.daysCount} dias</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{training.hoursPerDay}h/dia</span>
                </div>
              </div>
              <div className="text-xs text-gray-400">
                {formatDate(training.startDate)} até {formatDate(training.endDate)}
              </div>
              <Button
                className="mt-auto"
                onClick={() => enroll(training.id)}
                disabled={enrolling === training.id}
              >
                {enrolling === training.id ? 'Iniciando...' : 'Iniciar Treinamento'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
