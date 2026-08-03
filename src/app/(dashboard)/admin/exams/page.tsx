import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { db, exams } from '@/lib/db'
import { desc } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { FileText, CheckCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'Provas OAB' }

export default async function ExamsPage() {
  await requireRole('admin', 'super_admin')

  const allExams = await db
    .select()
    .from(exams)
    .orderBy(desc(exams.examNumber))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Provas OAB</h1>
        <p className="text-gray-500 mt-1">
          Base histórica de provas importadas ({allExams.length} exames)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allExams.map(exam => (
          <Card key={exam.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <span className="font-bold text-gray-900">
                    {exam.examNumber}º Exame
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">{exam.year}</Badge>
              </div>
              <div className="space-y-1 text-sm text-gray-500">
                <p>{exam.totalQuestions} questões</p>
                {exam.examDate && (
                  <p>Data: {formatDate(exam.examDate)}</p>
                )}
                {exam.importedAt && (
                  <div className="flex items-center gap-1 text-green-600 text-xs">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Importado em {formatDate(exam.importedAt)}
                  </div>
                )}
              </div>
              {exam.pdfUrl && (
                <a
                  href={exam.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block text-xs text-blue-500 hover:underline"
                >
                  Ver prova →
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {allExams.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma prova importada ainda</p>
            <p className="text-gray-400 text-sm mt-1">
              Acesse o painel Super Admin para importar o histórico
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
