import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { AddExamPanel } from '@/components/super-admin/add-exam-panel'

export const metadata: Metadata = { title: 'Incluir Nova Prova' }

export default async function AddExamPage() {
  await requireRole('admin', 'super_admin')

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Incluir Nova Prova</h1>
        <p className="text-gray-500 mt-1">
          Faça upload do PDF da prova e do gabarito. O sistema extrai as questões automaticamente
          e permite classificá-las por disciplina usando a IA configurada.
        </p>
      </div>

      <AddExamPanel />
    </div>
  )
}
