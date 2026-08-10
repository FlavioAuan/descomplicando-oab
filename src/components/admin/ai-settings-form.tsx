'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveAISettings, fetchOpenRouterFreeModels } from '@/server/actions/settings'
import type { AIProvider } from '@/server/actions/settings'
import { toast } from 'sonner'
import { Loader2, RefreshCw, Info } from 'lucide-react'

interface ProviderDef {
  id: AIProvider
  label: string
  envKey: string
  defaultModel: string
  freeModels?: string[]
  note?: string
}

const PROVIDERS: ProviderDef[] = [
  {
    id: 'groq',
    label: 'Groq (recomendado — gratuito)',
    envKey: 'GROQ_API_KEY',
    defaultModel: 'llama-3.1-8b-instant',
    freeModels: [
      'llama-3.1-8b-instant',
      'llama-3.3-70b-versatile',
      'llama3-70b-8192',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
      'deepseek-r1-distill-llama-70b',
      'qwen-qwq-32b',
    ],
    note: 'Se o limite diário for atingido, o sistema usa OpenRouter automaticamente (se OPENROUTER_API_KEY estiver configurada).',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    envKey: 'OPENROUTER_API_KEY',
    defaultModel: 'mistralai/mistral-7b-instruct:free',
    note: 'Use "Buscar modelos gratuitos" para ver os modelos disponíveis com sua chave.',
  },
  {
    id: 'openai',
    label: 'OpenAI (pago)',
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
    freeModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
  },
]

interface Props {
  initialSettings: { provider: AIProvider; model: string }
}

export function AISettingsForm({ initialSettings }: Props) {
  const normalizeProvider = (p: string): AIProvider =>
    PROVIDERS.find(x => x.id === p) ? (p as AIProvider) : 'groq'

  const [provider, setProvider] = useState<AIProvider>(normalizeProvider(initialSettings.provider))
  const [model, setModel] = useState(initialSettings.model)
  const [saving, setSaving] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [freeModels, setFreeModels] = useState<{ id: string; name: string }[]>([])

  function handleProviderChange(p: AIProvider) {
    setProvider(p)
    setModel(PROVIDERS.find(x => x.id === p)?.defaultModel ?? '')
    setFreeModels([])
  }

  async function handleFetchModels() {
    setLoadingModels(true)
    const models = await fetchOpenRouterFreeModels()
    if (models.length === 0) {
      toast.error('Nenhum modelo gratuito encontrado. Verifique se OPENROUTER_API_KEY está definida no .env.')
    } else {
      setFreeModels(models)
      toast.success(`${models.length} modelos gratuitos encontrados`)
    }
    setLoadingModels(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await saveAISettings({ provider, model })
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Configurações salvas')
    }
    setSaving(false)
  }

  const currentProvider = PROVIDERS.find(p => p.id === provider) ?? PROVIDERS[0]

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl border p-6 shadow-sm">

      {/* Env var notice */}
      <div className="flex gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 space-y-1.5">
          <p className="font-semibold">Chaves de API — variáveis de ambiente</p>
          <p>As chaves nunca são salvas no banco de dados. Defina-as no arquivo <code className="bg-amber-100 px-1 rounded font-mono text-xs">.env.local</code>:</p>
          <div className="font-mono text-xs bg-amber-100 rounded p-2 space-y-0.5">
            <p>GROQ_API_KEY=sua-chave-groq</p>
            <p>OPENROUTER_API_KEY=sua-chave-openrouter</p>
            <p>OPENAI_API_KEY=sua-chave-openai</p>
          </div>
          <p className="text-xs">Obtenha as chaves em: <strong>console.groq.com</strong> · <strong>openrouter.ai</strong> · <strong>platform.openai.com</strong></p>
        </div>
      </div>

      {/* Provider selector */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-gray-700">Provedor de IA ativo</Label>
        <div className="grid gap-2">
          {PROVIDERS.map(p => (
            <label
              key={p.id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                provider === p.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="provider"
                value={p.id}
                checked={provider === p.id}
                onChange={() => handleProviderChange(p.id)}
                className="accent-blue-600 mt-0.5"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">{p.label}</p>
                <p className="text-xs text-gray-400 font-mono">{p.envKey}</p>
                {p.note && <p className="text-xs text-gray-500 mt-1">{p.note}</p>}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Model */}
      <div className="space-y-1.5">
        <Label htmlFor="model" className="text-sm font-semibold text-gray-700">Modelo</Label>
        <Input
          id="model"
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder={currentProvider.defaultModel}
          required
          className="font-mono text-sm"
        />

        {/* OpenRouter: fetch live free models */}
        {provider === 'openrouter' && (
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleFetchModels}
              disabled={loadingModels}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40"
            >
              {loadingModels
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <RefreshCw className="w-3 h-3" />}
              Buscar modelos gratuitos disponíveis
            </button>
            {freeModels.length > 0 && (
              <div className="max-h-48 overflow-y-auto flex flex-col gap-1 border rounded-lg p-2 bg-gray-50">
                {freeModels.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModel(m.id)}
                    className={`text-left text-xs px-2 py-1 rounded transition-colors ${
                      model === m.id
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-blue-50 text-gray-700'
                    }`}
                  >
                    <span className="font-mono">{m.id}</span>
                    {m.name && m.name !== m.id && (
                      <span className="ml-2 text-gray-400 font-sans">{m.name}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Groq / OpenAI: fixed model list */}
        {currentProvider.freeModels && provider !== 'openrouter' && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {currentProvider.freeModels.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setModel(m)}
                className={`text-xs px-2 py-0.5 rounded border font-mono transition-colors ${
                  model === m
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" disabled={saving} className="w-full">
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Salvar configurações
      </Button>
    </form>
  )
}
