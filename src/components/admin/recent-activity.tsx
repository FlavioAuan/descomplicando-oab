import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { db, aiGenerations, importHistory } from '@/lib/db'
import { desc } from 'drizzle-orm'
import { formatDateTime } from '@/lib/utils'
import { Brain, Upload, CheckCircle, XCircle } from 'lucide-react'

export async function RecentActivity() {
  const [recentGenerations, recentImports] = await Promise.all([
    db.select().from(aiGenerations).orderBy(desc(aiGenerations.createdAt)).limit(5),
    db.select().from(importHistory).orderBy(desc(importHistory.startedAt)).limit(3),
  ])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentImports.map((imp) => (
            <div key={imp.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-1.5 bg-blue-100 rounded">
                <Upload className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">
                  Importação: {imp.source}
                </p>
                <p className="text-xs text-gray-500">
                  {imp.countExams || 0} provas · {imp.countQuestions || 0} questões · {formatDateTime(imp.startedAt)}
                </p>
              </div>
              {imp.status === 'completed' ? (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              )}
            </div>
          ))}

          {recentGenerations.map((gen) => (
            <div key={gen.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-1.5 bg-purple-100 rounded">
                <Brain className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">
                  IA: {gen.type.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-gray-500">
                  {gen.model} · {gen.durationMs ? `${(gen.durationMs / 1000).toFixed(1)}s` : '-'} · {formatDateTime(gen.createdAt)}
                </p>
              </div>
              {gen.success ? (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              )}
            </div>
          ))}

          {recentImports.length === 0 && recentGenerations.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhuma atividade recente
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
