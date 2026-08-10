'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Loader2, Plus, Sparkles, Trash2, BookOpen, HelpCircle, ChevronDown, ChevronUp,
} from 'lucide-react'
import { createExerciseSet, deleteExerciseSet } from '@/server/actions/exercises'
import type { ExerciseSetItem } from '@/server/actions/exercises'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

interface Props {
  initialSets: ExerciseSetItem[]
  apostilas: { id: string; title: string }[]
}

export function ExercisesPanel({ initialSets, apostilas }: Props) {
  const router = useRouter()
  const [sets, setSets] = useState(initialSets)

  // Form
  const [title, setTitle] = useState('')
  const [apostilaId, setApostilaId] = useState('')
  const [count, setCount] = useState(10)
  const [generating, setGenerating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleCreate() {
    if (!title.trim()) { toast.error('Informe o título'); return }
    if (!apostilaId) { toast.error('Selecione uma apostila'); return }
    setGenerating(true)
    const fd = new FormData()
    fd.append('title', title.trim())
    fd.append('apostilaId', apostilaId)
    fd.append('count', String(count))
    const res = await createExerciseSet(fd)
    setGenerating(false)
    if ('error' in res) { toast.error(res.error); return }
    toast.success(`${res.data.questionCount} questões geradas!`)
    setTitle(''); setApostilaId(''); setCount(10)
    router.refresh()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const res = await deleteExerciseSet(id)
    if ('error' in res) toast.error(res.error)
    else { toast.success('Excluído'); setSets(prev => prev.filter(s => s.id !== id)); router.refresh() }
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      {/* Creation form */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <h2 className="font-semibold text-gray-900">Gerar Exercícios com IA</h2>
        </div>

        <div className="space-y-1">
          <Label htmlFor="ex-title">Título do conjunto <span className="text-red-500">*</span></Label>
          <Input
            id="ex-title"
            placeholder="Ex: Exercícios — Contratos no Direito Civil"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="ex-apostila">Apostila base <span className="text-red-500">*</span></Label>
            <select
              id="ex-apostila"
              value={apostilaId}
              onChange={e => setApostilaId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">— Selecionar apostila —</option>
              {apostilas.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ex-count">Quantidade de questões</Label>
            <Input
              id="ex-count"
              type="number"
              min={3}
              max={20}
              value={count}
              onChange={e => setCount(parseInt(e.target.value) || 10)}
            />
          </div>
        </div>

        <Button
          onClick={handleCreate}
          disabled={generating || !title.trim() || !apostilaId}
          className="w-full"
          size="lg"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando questões com IA…</>
            : <><Plus className="w-4 h-4 mr-2" />Criar Exercícios</>}
        </Button>
      </div>

      {/* List */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-900">
          Conjuntos criados
          {sets.length > 0 && <Badge className="ml-2 bg-gray-100 text-gray-600">{sets.length}</Badge>}
        </h2>

        {sets.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center">
            <HelpCircle className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum conjunto criado ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sets.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <HelpCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{s.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {s.questionCount} questões · {formatDate(s.createdAt)}
                      {s.apostilaTitle && <> · <span className="text-blue-600">{s.apostilaTitle}</span></>}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0 ml-4"
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                >
                  {deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
