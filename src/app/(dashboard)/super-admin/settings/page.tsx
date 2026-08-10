import { Metadata } from 'next'
import { requireRole } from '@/server/actions/auth'
import { getAISettings } from '@/server/actions/settings'
import { AISettingsForm } from '@/components/admin/ai-settings-form'

export const metadata: Metadata = { title: 'Configurações IA' }

export default async function SettingsPage() {
  await requireRole('admin', 'super_admin')

  const settings = await getAISettings()

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações de IA</h1>
        <p className="text-gray-500 mt-1">
          Configure o provedor e a chave de API usados pelo sistema para gerar conteúdo.
        </p>
      </div>

      <AISettingsForm initialSettings={{ provider: settings.provider, model: settings.model }} />
    </div>
  )
}
