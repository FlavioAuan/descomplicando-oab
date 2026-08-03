import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { ClassifyPanel } from '@/components/super-admin/classify-panel'
import { questionsRepository } from '@/server/repositories/questions'

export const metadata: Metadata = { title: 'Classificação IA' }

export default async function ClassifyPage() {
  await requireRole('super_admin')

  const [total, classified] = await Promise.all([
    questionsRepository.countTotal(),
    questionsRepository.countClassified(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Classificação com IA</h1>
        <p className="text-gray-500 mt-1">
          Utilize o Claude para classificar questões por disciplina, subtema e microtema
        </p>
      </div>

      <ClassifyPanel
        total={total}
        classified={classified}
        unclassified={total - classified}
      />
    </div>
  )
}
