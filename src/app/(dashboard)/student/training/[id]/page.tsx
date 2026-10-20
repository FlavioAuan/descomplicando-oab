import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/server/actions/auth'
import { getStudentTraining } from '@/server/services/student-training'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ArrowLeft, CheckCircle2, ChevronRight, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TOPIC_TYPES } from '@/components/student/training-topic-types'

export const metadata: Metadata = { title: 'Meu Treinamento' }

export default async function StudentTrainingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireUser()
  const { id } = await params
  const data = await getStudentTraining(id, user)
  if (!data) notFound()

  const { training, days, currentDay } = data
  const allTopics = days.flatMap(d => d.topics)
  const doneCount = allTopics.filter(t => t.completed).length
  const percent = allTopics.length ? (doneCount / allTopics.length) * 100 : 0
  const nextTopic = allTopics.find(t => !t.completed)
  const current = days.find(d => d.dayNumber === currentDay) ?? days[0]

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/student/training" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Meu Treinamento
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{training.name}</h1>
        {training.description && <p className="text-gray-500 mt-1">{training.description}</p>}
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-5 space-y-3">
          <div className="flex justify-between text-sm text-blue-800">
            <span>Dia {currentDay} de {days.length} · {doneCount} de {allTopics.length} atividades</span>
            <span className="font-semibold">{percent.toFixed(0)}%</span>
          </div>
          <Progress value={percent} className="h-2" />
          {nextTopic && (
            <Link
              href={`/student/training/${id}/topic/${nextTopic.id}`}
              className="flex items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 text-sm hover:bg-blue-100 transition-colors"
            >
              <span>
                <span className="text-gray-500">Próxima atividade: </span>
                <span className="font-medium text-gray-800">{nextTopic.title}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-blue-600 flex-shrink-0" />
            </Link>
          )}
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={current ? [current.id] : []} className="space-y-2">
        {days.map(day => {
          const dayDone = day.topics.length > 0 && day.topics.every(t => t.completed)
          return (
            <AccordionItem key={day.id} value={day.id} className="border rounded-xl overflow-hidden bg-white">
              <AccordionTrigger className="px-4 hover:no-underline hover:bg-gray-50">
                <div className="flex items-center gap-3 text-left w-full">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
                    dayDone ? 'bg-green-600' : day.dayNumber === currentDay ? 'bg-blue-600' : 'bg-gray-400',
                  )}>
                    {day.dayNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{day.title}</p>
                    <p className="text-xs text-gray-400">
                      {day.topics.filter(t => t.completed).length}/{day.topics.length} atividades
                      {day.estimatedHours ? ` · ${day.estimatedHours}h` : ''}
                    </p>
                  </div>
                  {day.dayNumber === currentDay && !dayDone && <Badge className="bg-blue-600 text-white">Hoje</Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {day.description && <p className="text-sm text-gray-600 mb-3">{day.description}</p>}
                <div className="space-y-2">
                  {day.topics.map(topic => (
                    <Link
                      key={topic.id}
                      href={`/student/training/${id}/topic/${topic.id}`}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {topic.completed
                        ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />}
                      <span className="text-lg flex-shrink-0">{TOPIC_TYPES[topic.type]?.icon ?? '📌'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{topic.title}</p>
                        <p className="text-xs text-gray-400">
                          {TOPIC_TYPES[topic.type]?.label ?? topic.type} · {topic.estimatedMinutes ?? 30} min
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
