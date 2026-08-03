'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Upload, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ImportProgress {
  status: 'idle' | 'running' | 'completed' | 'error'
  message: string
  examsFound: number
  examsImported: number
  questionsImported: number
  currentExam: string
}

export function ImportPanel() {
  const [progress, setProgress] = useState<ImportProgress>({
    status: 'idle',
    message: '',
    examsFound: 0,
    examsImported: 0,
    questionsImported: 0,
    currentExam: '',
  })

  async function startImport() {
    setProgress({
      status: 'running',
      message: 'Iniciando importação...',
      examsFound: 0,
      examsImported: 0,
      questionsImported: 0,
      currentExam: '',
    })

    try {
      const response = await fetch('/api/import/historical', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Falha ao iniciar importação')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response stream')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n').filter(Boolean)

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6))
              setProgress(data)

              if (data.status === 'completed') {
                toast.success(`Importação concluída! ${data.examsImported} provas, ${data.questionsImported} questões`)
              } else if (data.status === 'error') {
                toast.error('Erro durante a importação: ' + data.message)
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      setProgress(prev => ({
        ...prev,
        status: 'error',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      }))
      toast.error('Falha na importação')
    }
  }

  const progressPercent = progress.examsFound > 0
    ? (progress.examsImported / progress.examsFound) * 100
    : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Módulo de Importação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            <strong>Atenção:</strong> A importação automática busca provas históricas da OAB.
            Execute apenas uma vez. Após a importação inicial, use o upload manual para novas provas.
          </AlertDescription>
        </Alert>

        {progress.status === 'idle' && (
          <Button onClick={startImport} size="lg" className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            Iniciar Importação Histórica
          </Button>
        )}

        {progress.status === 'running' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm text-gray-600">{progress.message}</span>
            </div>
            {progress.currentExam && (
              <p className="text-xs text-gray-400">Processando: {progress.currentExam}</p>
            )}
            <Progress value={progressPercent} className="h-2" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-gray-800">{progress.examsFound}</div>
                <div className="text-xs text-gray-400">Provas encontradas</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">{progress.examsImported}</div>
                <div className="text-xs text-gray-400">Importadas</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">{progress.questionsImported}</div>
                <div className="text-xs text-gray-400">Questões</div>
              </div>
            </div>
          </div>
        )}

        {progress.status === 'completed' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Importação concluída com sucesso!</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center bg-green-50 rounded-lg p-4">
              <div>
                <div className="text-2xl font-bold text-green-700">{progress.examsImported}</div>
                <div className="text-xs text-green-500">Provas importadas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-700">{progress.questionsImported}</div>
                <div className="text-xs text-green-500">Questões importadas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-700">
                  {new Date().toLocaleDateString('pt-BR')}
                </div>
                <div className="text-xs text-green-500">Data</div>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Próximo passo: Classificar com IA
            </Button>
          </div>
        )}

        {progress.status === 'error' && (
          <div className="space-y-3">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                Erro: {progress.message}
              </AlertDescription>
            </Alert>
            <Button variant="outline" onClick={startImport}>
              Tentar novamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
