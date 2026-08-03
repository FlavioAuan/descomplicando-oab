import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import type { InferSelectModel } from 'drizzle-orm'
import type { importHistory } from '@/lib/db/schema'

type ImportRecord = InferSelectModel<typeof importHistory>

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pendente', class: 'bg-yellow-100 text-yellow-700' },
  running: { label: 'Em execução', class: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Concluído', class: 'bg-green-100 text-green-700' },
  failed: { label: 'Falhou', class: 'bg-red-100 text-red-700' },
}

export function ImportHistoryTable({ history }: { history: ImportRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Histórico de Importações</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            Nenhuma importação realizada ainda
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-2 pr-4">Fonte</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-right py-2 pr-4">Provas</th>
                  <th className="text-right py-2 pr-4">Questões</th>
                  <th className="text-left py-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => {
                  const status = STATUS_LABELS[record.status] || STATUS_LABELS.pending
                  return (
                    <tr key={record.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium text-gray-700 max-w-xs truncate">
                        {record.source}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={status.class}>{status.label}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-600">
                        {record.countExams || '-'}
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-600">
                        {record.countQuestions || '-'}
                      </td>
                      <td className="py-3 text-gray-400">
                        {formatDateTime(record.startedAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
