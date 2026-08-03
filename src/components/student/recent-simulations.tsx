import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { StudentSimulation } from '@/types'
import { formatDate, formatPercent } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface RecentSimulationsProps {
  simulations: StudentSimulation[]
}

export function RecentSimulations({ simulations }: RecentSimulationsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Simulados Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        {simulations.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Nenhum simulado realizado ainda
          </p>
        ) : (
          <div className="space-y-3">
            {simulations.map((sim) => (
              <div
                key={sim.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {sim.totalAnswered} questões respondidas
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDate(sim.startedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    className={cn(
                      sim.percentage >= 0.6
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    )}
                  >
                    {formatPercent(sim.percentage)}
                  </Badge>
                  <p className="text-xs text-gray-400 mt-1">
                    {sim.totalCorrect}/{sim.totalAnswered}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
