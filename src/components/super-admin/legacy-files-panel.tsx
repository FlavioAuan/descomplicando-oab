'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { importLegacyFiles } from '@/server/actions/legacy-files'
import { toast } from 'sonner'
import { Loader2, Download } from 'lucide-react'

export function LegacyFilesPanel({ total, missing }: { total: number; missing: number }) {
  const [loading, setLoading] = useState(false)
  const [remaining, setRemaining] = useState(missing)
  const [failed, setFailed] = useState<string[]>([])

  async function handleImport() {
    setLoading(true)
    try {
      const result = await importLegacyFiles()
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      setRemaining(result.failed.length)
      setFailed(result.failed)
      if (result.failed.length) toast.warning(`${result.downloaded} arquivos importados, ${result.failed.length} com erro.`)
      else toast.success(`${result.downloaded} arquivos importados.`)
    } catch {
      toast.error('Erro ao importar arquivos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <div>
        <h2 className="font-semibold text-gray-900">Arquivos do Supabase</h2>
        <p className="text-sm text-gray-500">
          {remaining === 0
            ? `Todos os ${total} arquivos já estão no servidor.`
            : `${remaining} de ${total} arquivos ainda precisam ser copiados do Supabase para o servidor.`}
        </p>
      </div>
      {remaining > 0 && (
        <Button onClick={handleImport} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          {loading ? 'Importando…' : 'Importar arquivos do Supabase'}
        </Button>
      )}
      {failed.length > 0 && (
        <ul className="text-xs text-red-600 list-disc pl-4 max-h-40 overflow-auto">
          {failed.map((f) => <li key={f}>{f}</li>)}
        </ul>
      )}
    </div>
  )
}
