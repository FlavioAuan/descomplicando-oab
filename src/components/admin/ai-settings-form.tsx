'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveAISettings } from '@/server/actions/settings'
import type { AISettings, AIProvider } from '@/server/actions/settings'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'

const PROVIDERS: { id: AIProvider; label: string; hint: string; defaultModel: string; freeModels?: string[] }[] = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    hint: 'Acesse openrouter.ai para obter sua chave.',
    defaultModel: 'meta-llama/llama-3.1-8b-instruct:free',
    freeModels: [
      'meta-llama/llama-3.1-8b-instruct:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemini-2.0-flash-exp:free',
      'google/gemini-1.5-flash-8b',
      'mistralai/mistral-7b-instruct:free',
      'deepseek/deepseek-chat:free',
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    hint: 'Acesse platform.openai.com para obter sua chave.',
    defaultModel: 'gpt-4o-mini',
  },
  {
    id: 'grok',
    label: 'Grok (xAI)',
    hint: 'Acesse console.x.ai para obter sua chave.',
    defaultModel: 'grok-3-mini',
  },
]

interface Props {
  initialSettings: AISettings
}

export function AISettingsForm({ initialSettings }: Props) {
  const [provider, setProvider] = useState<AIProvider>(initialSettings.provider)
  const [apiKey, setApiKey] = useState(initialSettings.apiKey)
  const [model, setModel] = useState(initialSettings.model)
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)

  function handleProviderChange(p: AIProvider) {
    setProvider(p)
    const def = PROVIDERS.find(x => x.id === p)?.defaultModel ?? ''
    setModel(def)
    setApiKey('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await saveAISettings({ provider, apiKey, model })
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Configurações salvas com sucesso')
    }
    setSaving(false)
  }

  const currentProvider = PROVIDERS.find(p => p.id === provider)!

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl border p-6 shadow-sm">
      {/* Provider selector */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-gray-700">Provedor de IA</Label>
        <div className="grid gap-2">
          {PROVIDERS.map(p => (
            <label
              key={p.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
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
                className="accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-800">{p.label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500">{currentProvider.hint}</p>
      </div>

      {/* API Key */}
      <div className="space-y-1.5">
        <Label htmlFor="apiKey" className="text-sm font-semibold text-gray-700">
          Chave de API
        </Label>
        <div className="relative">
          <Input
            id="apiKey"
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-..."
            required
            className="pr-10 font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => setShowKey(v => !v)}
            className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Model */}
      <div className="space-y-1.5">
        <Label htmlFor="model" className="text-sm font-semibold text-gray-700">
          Modelo
        </Label>
        <Input
          id="model"
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder={currentProvider.defaultModel}
          required
          className="font-mono text-sm"
        />
        {currentProvider.freeModels && (
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
