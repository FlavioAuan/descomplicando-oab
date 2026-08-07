import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getTrendColor, getTrendIcon } from '@/lib/utils'

interface TrendingTopicsProps {
  subjects: Array<{
    name: string
    count: number
    percentage: number
    trend: string
  }>
}

export function TrendingTopics({ subjects }: TrendingTopicsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ranking de Disciplinas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {subjects.map((subject, index) => (
            <div key={subject.name} className="flex items-center gap-3">
              <span className="w-6 text-center text-sm font-bold text-gray-400">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {subject.name}
                  </span>
                  <span className={`text-xs font-medium ${getTrendColor(subject.trend)}`}>
                    {getTrendIcon(subject.trend)} {(subject.percentage * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(subject.percentage * 100 * 5, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
