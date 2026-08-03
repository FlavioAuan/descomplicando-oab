import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { db, studentTrainingProgress, trainingDays, trainingTopics } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { cn } from '@/lib/utils'

interface WeeklyCalendarProps {
  userId: string
}

export async function WeeklyCalendar({ userId }: WeeklyCalendarProps) {
  const progress = await db
    .select()
    .from(studentTrainingProgress)
    .where(eq(studentTrainingProgress.userId, userId))
    .limit(1)

  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - today.getDay() + i)
    return d
  })

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Calendário da Semana</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, i) => {
            const isToday = day.toDateString() === today.toDateString()
            const isPast = day < today && !isToday

            return (
              <div
                key={i}
                className={cn(
                  'flex flex-col items-center p-2 rounded-lg',
                  isToday && 'bg-blue-600 text-white',
                  !isToday && isPast && 'bg-green-50',
                  !isToday && !isPast && 'bg-gray-50'
                )}
              >
                <span className={cn(
                  'text-xs font-medium mb-1',
                  isToday ? 'text-blue-100' : 'text-gray-500'
                )}>
                  {dayNames[i]}
                </span>
                <span className={cn(
                  'text-sm font-bold',
                  isToday ? 'text-white' : 'text-gray-800'
                )}>
                  {day.getDate()}
                </span>
                {isPast && (
                  <span className="text-green-500 text-xs mt-1">✓</span>
                )}
                {isToday && (
                  <span className="text-blue-200 text-xs mt-1">hoje</span>
                )}
              </div>
            )
          })}
        </div>

        {progress.length === 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-center">
            <p className="text-sm text-blue-600 font-medium">
              Nenhum treinamento ativo
            </p>
            <p className="text-xs text-blue-400 mt-1">
              Acesse &quot;Meu Treinamento&quot; para começar
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
