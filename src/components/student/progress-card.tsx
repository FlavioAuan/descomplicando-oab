import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { User } from '@/types'
import { calculateXpForLevel } from '@/lib/utils'

interface StudentProgressCardProps {
  user: User
  accuracy: number
}

export function StudentProgressCard({ user, accuracy }: StudentProgressCardProps) {
  const xpForCurrentLevel = calculateXpForLevel(user.level)
  const xpIntoLevel = user.xp % xpForCurrentLevel
  const progressPercent = (xpIntoLevel / xpForCurrentLevel) * 100

  const approvalEstimate = Math.min(
    Math.round(accuracy * 100 * 0.8 + (user.streak > 7 ? 10 : 0) + (user.level * 2)),
    99
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Meu Progresso</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Level */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              Nível {user.level}
            </span>
            <span className="text-xs text-gray-400">
              {user.xp} XP
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-gray-400 mt-1">
            {xpForCurrentLevel - xpIntoLevel} XP para o próximo nível
          </p>
        </div>

        {/* Accuracy */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">Taxa de Acerto</span>
            <span className="text-sm font-bold text-gray-800">
              {(accuracy * 100).toFixed(0)}%
            </span>
          </div>
          <Progress
            value={accuracy * 100}
            className="h-2"
          />
          <p className="text-xs text-gray-400 mt-1">
            Meta OAB: 60%
          </p>
        </div>

        {/* Approval Estimate */}
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-700">{approvalEstimate}%</div>
          <div className="text-sm text-blue-500 mt-1">Estimativa de aprovação</div>
        </div>
      </CardContent>
    </Card>
  )
}
