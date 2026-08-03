import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { getImportHistory } from '@/server/services/import'
import { ImportPanel } from '@/components/super-admin/import-panel'
import { ImportHistoryTable } from '@/components/super-admin/import-history-table'

export const metadata: Metadata = { title: 'Importação Histórica OAB' }

export default async function ImportPage() {
  await requireRole('super_admin')
  const history = await getImportHistory()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importação Histórica OAB</h1>
        <p className="text-gray-500 mt-1">
          Execute a importação manual das provas históricas da OAB.
          Esta operação deve ser executada apenas uma vez.
        </p>
      </div>

      <ImportPanel />
      <ImportHistoryTable history={history} />
    </div>
  )
}
