'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Loader2, Wand2, Calendar, BookOpen, Zap } from 'lucide-react'
import { generateTrainingWithAI } from '@/server/actions/trainings'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import type { Training } from '@/types'

const TOPIC_TYPE_ICONS: Record<string, string> = {
  apostila: '📖',
  flashcard: '🧠',
  exercise: '✏️',
  simulation: '📝',
  video: '🎥',
  review: '🔄',
}

const TOPIC_TYPE_LABELS: Record<string, string> = {
  apostila: 'Apostila',
  flashcard: 'Flashcards',
  exercise: 'Exercícios',
  simulation: 'Simulado',
  video: 'Vídeoaula',
  review: 'Revisão',
}

interface TrainingEditorProps {
  training: Training & {
    days?: Array<{
      id: string
      dayNumber: number
      title: string
      description: string | null
      estimatedHours: number | null
      topics: Array<{
        id: string
        order: number
        title: string
        type: string
        estimatedMinutes: number | null
      }>
    }>
  }
  versions: Array<{
    id: string
    versionNumber: number
    changesDescription: string | null
    changedAt: Date
  }>
}

export function TrainingEditor({ training, versions }: TrainingEditorProps) {
  const [generatingAI, setGeneratingAI] = useState(false)
  const router = useRouter()

  async function generateWithAI() {
    setGeneratingAI(true)
    toast.info('Gerando cronograma com IA... isso pode levar alguns minutos')

    const result = await generateTrainingWithAI(training.id)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Cronograma gerado com sucesso!')
      router.refresh()
    }

    setGeneratingAI(false)
  }

  const hasDays = training.days && training.days.length > 0

  return (
    <Tabs defaultValue="schedule">
      <TabsList>
        <TabsTrigger value="schedule">
          <Calendar className="w-4 h-4 mr-1.5" />
          Cronograma
        </TabsTrigger>
        <TabsTrigger value="info">Informações</TabsTrigger>
        <TabsTrigger value="versions">Versões ({versions.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="schedule" className="mt-4 space-y-4">
        {!hasDays && (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
                <Wand2 className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Nenhum cronograma gerado</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Clique abaixo para gerar o cronograma completo com IA
                </p>
              </div>
              <Button onClick={generateWithAI} disabled={generatingAI} size="lg">
                {generatingAI ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                {generatingAI ? 'Gerando...' : 'Gerar com IA'}
              </Button>
            </CardContent>
          </Card>
        )}

        {hasDays && (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {training.days!.length} dias programados
              </p>
              <Button variant="outline" size="sm" onClick={generateWithAI} disabled={generatingAI}>
                {generatingAI ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-1" />
                )}
                Regenerar com IA
              </Button>
            </div>

            <Accordion type="multiple" className="space-y-2">
              {training.days!.map(day => (
                <AccordionItem
                  key={day.id}
                  value={day.id}
                  className="border rounded-xl overflow-hidden"
                >
                  <AccordionTrigger className="px-4 hover:no-underline hover:bg-gray-50">
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {day.dayNumber}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{day.title}</p>
                        <p className="text-xs text-gray-400">
                          {day.topics.length} atividades ·{' '}
                          {day.estimatedHours}h estimadas
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {day.description && (
                      <p className="text-sm text-gray-600 mb-3">{day.description}</p>
                    )}
                    <div className="space-y-2">
                      {day.topics.map(topic => (
                        <div
                          key={topic.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <span className="text-lg">
                            {TOPIC_TYPE_ICONS[topic.type] || '📌'}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">
                              {topic.title}
                            </p>
                            <p className="text-xs text-gray-400">
                              {TOPIC_TYPE_LABELS[topic.type]} ·{' '}
                              {topic.estimatedMinutes} min
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {TOPIC_TYPE_LABELS[topic.type]}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </>
        )}
      </TabsContent>

      <TabsContent value="info" className="mt-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoItem label="Duração" value={`${training.daysCount} dias`} />
              <InfoItem label="Horas/dia" value={`${training.hoursPerDay}h`} />
              <InfoItem label="Início" value={formatDate(training.startDate)} />
              <InfoItem label="Fim" value={formatDate(training.endDate)} />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="versions" className="mt-4">
        <Card>
          <CardContent className="p-6">
            {versions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Nenhuma versão salva ainda
              </p>
            ) : (
              <div className="space-y-2">
                {versions.map(v => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Versão {v.versionNumber}
                      </p>
                      <p className="text-xs text-gray-400">
                        {v.changesDescription || 'Sem descrição'} ·{' '}
                        {formatDate(v.changedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="font-semibold text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}
