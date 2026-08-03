import { Metadata } from 'next'
import { requireUser } from '@/server/actions/auth'
import { db, certificates, trainings } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Download } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Certificados' }

export default async function CertificatesPage() {
  const user = await requireUser()

  const userCertificates = await db
    .select({
      id: certificates.id,
      code: certificates.code,
      hoursCompleted: certificates.hoursCompleted,
      averageScore: certificates.averageScore,
      issuedAt: certificates.issuedAt,
      pdfUrl: certificates.pdfUrl,
      trainingName: trainings.name,
    })
    .from(certificates)
    .innerJoin(trainings, eq(certificates.trainingId, trainings.id))
    .where(eq(certificates.userId, user.id))
    .orderBy(certificates.issuedAt)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meus Certificados</h1>
        <p className="text-gray-500 mt-1">
          Certificados de conclusão dos seus treinamentos
        </p>
      </div>

      {userCertificates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum certificado ainda</p>
            <p className="text-gray-400 text-sm mt-1">
              Complete um treinamento para receber seu certificado
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userCertificates.map(cert => (
            <Card key={cert.id} className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                  </div>
                  <Badge className="bg-green-100 text-green-700">
                    {(cert.averageScore * 100).toFixed(0)}% aproveitamento
                  </Badge>
                </div>
                <h3 className="font-bold text-gray-900 text-lg">{cert.trainingName}</h3>
                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  <p>Carga horária: {cert.hoursCompleted}h</p>
                  <p>Emitido em: {formatDate(cert.issuedAt)}</p>
                  {cert.code && (
                    <p className="font-mono text-xs text-gray-400">#{cert.code}</p>
                  )}
                </div>
                {cert.pdfUrl && (
                  <a href={cert.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <button className="mt-4 w-full flex items-center justify-center gap-2 border border-yellow-300 rounded-lg py-2 text-sm text-yellow-700 hover:bg-yellow-50 transition-colors">
                      <Download className="w-4 h-4" />
                      Baixar Certificado
                    </button>
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
