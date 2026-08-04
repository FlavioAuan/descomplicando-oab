import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SubjectChart } from './subject-chart'
import { getTrendColor, getTrendIcon } from '@/lib/utils'
import type { SubjectStat } from '@/server/services/statistics'

interface StatisticsViewProps {
  stats: SubjectStat[]
  hotTopics: Array<{ name: string; subject: string; percentage: number; trend: string }>
}

export function StatisticsView({ stats, hotTopics }: StatisticsViewProps) {
  const chartData = stats.slice(0, 10).map(s => ({
    name: s.subjectName,
    count: s.totalQuestions,
    percentage: s.percentageHistorical,
    trend: s.trend,
  }))

  return (
    <Tabs defaultValue="ranking">
      <TabsList>
        <TabsTrigger value="ranking">Ranking Disciplinas</TabsTrigger>
        <TabsTrigger value="hot">Temas Quentes</TabsTrigger>
        <TabsTrigger value="chart">Gráfico</TabsTrigger>
      </TabsList>

      <TabsContent value="ranking" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranking por Total de Questões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.map((stat, i) => (
                <div key={stat.subjectId} className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-bold text-gray-400">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{stat.subjectName}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${getTrendColor(stat.trend)}`}>
                          {getTrendIcon(stat.trend)}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">
                          {stat.totalQuestions}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({(stat.percentageHistorical * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(stat.percentageHistorical * 100 * 5, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>Presente em {stat.presenceInExams} exames ({(stat.presencePercentage * 100).toFixed(0)}%)</span>
                      <span>~{stat.avgPerExam.toFixed(1)} por exame</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="hot" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              🔥 Temas em Alta (crescimento recente)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hotTopics.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Dados insuficientes para detectar tendências
              </p>
            ) : (
              <div className="space-y-2">
                {hotTopics.map((topic, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{topic.name}</p>
                      <p className="text-xs text-gray-500">{topic.subject}</p>
                    </div>
                    <Badge className="bg-orange-100 text-orange-700">
                      {(topic.percentage * 100).toFixed(0)}% recente
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="chart" className="mt-4">
        <SubjectChart data={chartData} />
      </TabsContent>
    </Tabs>
  )
}
