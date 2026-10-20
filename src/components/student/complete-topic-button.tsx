'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { completeTrainingTopic } from '@/server/actions/student'
import { toast } from 'sonner'

interface Props {
  trainingId: string
  topicId: string
  completed: boolean
  nextHref: string
}

export function CompleteTopicButton({ trainingId, topicId, completed, nextHref }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  if (completed) {
    return (
      <Button variant="outline" onClick={() => router.push(nextHref)}>
        <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
        Concluída · continuar
      </Button>
    )
  }

  async function handleComplete() {
    setSaving(true)
    try {
      await completeTrainingTopic({ trainingId, topicId })
      toast.success('Atividade concluída!')
      router.push(nextHref)
      router.refresh()
    } catch {
      toast.error('Não foi possível salvar. Tente novamente.')
      setSaving(false)
    }
  }

  return (
    <Button onClick={handleComplete} disabled={saving}>
      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
      Marcar como concluída
    </Button>
  )
}
