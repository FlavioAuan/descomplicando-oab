import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { getAISettings } from '@/server/actions/settings'
import { AISettingsForm } from '@/components/admin/ai-settings-form'
import { getLegacyFilesStatus } from '@/server/actions/legacy-files'
import { LegacyFilesPanel } from '@/components/super-admin/legacy-files-panel'

export const metadata: Metadata = { title: 'Configurações IA' }

export default async function SettingsPage() {
  const user = await requireRole('admin', 'super_admin')

  const settings = await getAISettings()
  const legacyFiles = user.role === 'super_admin' ? await getLegacyFilesStatus() : null

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações de IA</h1>
        <p className="text-gray-500 mt-1">
          Configure o provedor e a chave de API usados pelo sistema para gerar conteúdo.
        </p>
      </div>

      <AISettingsForm initialSettings={{
        provider: settings.provider,
        groqModel: settings.groqModel,
        openrouterModel: settings.openrouterModel,
        openaiModel: settings.openaiModel,
      }} />

      {legacyFiles?.enabled && (
        <LegacyFilesPanel total={legacyFiles.total} missing={legacyFiles.missing} />
      )}
    </div>
  )
}
