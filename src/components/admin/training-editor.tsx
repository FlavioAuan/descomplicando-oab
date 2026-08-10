'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Loader2, Wand2, Calendar, Pencil, Trash2, Plus, Zap, Upload, X,
} from 'lucide-react'
import {
  generateTrainingWithAI,
  updateTrainingTopic,
  deleteTrainingTopic,
  addTrainingTopic,
} from '@/server/actions/trainings'
import {
  listStandaloneApostilas,
  linkApostilaToTopic,
  createApostilaForTopic,
} from '@/server/actions/apostilas'
import { listExerciseSets } from '@/server/actions/exercises'
import { listFlashcardSets } from '@/server/actions/flashcard-sets'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import type { Training } from '@/types'

const TOPIC_TYPES = [
  { value: 'apostila',   label: 'Apostila',    icon: '📖' },
  { value: 'flashcard',  label: 'Flashcards',  icon: '🧠' },
  { value: 'exercise',   label: 'Exercícios',  icon: '✏️' },
  { value: 'simulation', label: 'Simulado',    icon: '📝' },
  { value: 'video',      label: 'Vídeoaula',   icon: '🎥' },
  { value: 'review',     label: 'Revisão',     icon: '🔄' },
]

function topicIcon(type: string) {
  return TOPIC_TYPES.find(t => t.value === type)?.icon ?? '📌'
}
function topicLabel(type: string) {
  return TOPIC_TYPES.find(t => t.value === type)?.label ?? type
}

type Topic = {
  id: string
  order: number
  title: string
  type: string
  estimatedMinutes: number | null
}

type Day = {
  id: string
  dayNumber: number
  date?: string | null
  title: string
  description: string | null
  estimatedHours: number | null
  topics: Topic[]
}

interface TrainingEditorProps {
  training: Training & { days?: Day[] }
  versions: Array<{
    id: string
    versionNumber: number
    changesDescription: string | null
    changedAt: Date
  }>
}

// ── Apostila picker (shared by both dialogs) ───────────────────────────────────

type ApostilaOption = { id: string; title: string }

function ApostilaPicker({
  topicTitle,
  onSelect,
}: {
  topicTitle: string
  onSelect: (apostilaId: string | null, uploadFile: File | null) => void
}) {
  const [apostilas, setApostilas] = useState<ApostilaOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listStandaloneApostilas().then(list => {
      setApostilas(list)
      setLoading(false)
    })
  }, [])

  function handleSelectChange(val: string) {
    setSelectedId(val)
    setUploadFile(null)
    onSelect(val || null, null)
  }

  function handleFile(file: File | null) {
    if (!file) return
    setUploadFile(file)
    setSelectedId('')
    onSelect(null, file)
  }

  return (
    <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Vincular Apostila</p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="w-3 h-3 animate-spin" /> Carregando apostilas…
        </div>
      ) : (
        <div className="space-y-2">
          <Select value={selectedId} onValueChange={handleSelectChange}>
            <SelectTrigger className="bg-white text-sm h-8">
              <SelectValue placeholder="— Selecionar apostila existente —" />
            </SelectTrigger>
            <SelectContent>
              {apostilas.length === 0 && (
                <SelectItem value="__none" disabled>Nenhuma apostila disponível</SelectItem>
              )}
              {apostilas.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex-1 border-t" />
            <span>ou</span>
            <div className="flex-1 border-t" />
          </div>

          {uploadFile ? (
            <div className="flex items-center gap-2 bg-white rounded px-2 py-1.5 text-xs border">
              <span className="flex-1 truncate text-gray-700">{uploadFile.name}</span>
              <button
                type="button"
                onClick={() => { setUploadFile(null); onSelect(null, null) }}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 border border-dashed border-blue-300 rounded px-3 py-2 text-xs text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Fazer upload de PDF e gerar apostila
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0] ?? null)}
          />
        </div>
      )}
    </div>
  )
}

// ── Generic content picker (exercises, flashcard sets) ────────────────────────

type ContentOption = { id: string; title: string }

function ContentPicker({
  type,
  onSelect,
}: {
  type: 'exercise' | 'flashcard'
  onSelect: (id: string | null) => void
}) {
  const [options, setOptions] = useState<ContentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')

  const label = type === 'exercise' ? 'Exercícios' : 'Flashcards'
  const color = type === 'exercise' ? 'purple' : 'green'

  useEffect(() => {
    const loader = type === 'exercise' ? listExerciseSets() : listFlashcardSets()
    loader.then((list: ContentOption[]) => { setOptions(list); setLoading(false) })
  }, [type])

  return (
    <div className={`space-y-2 rounded-lg border border-${color}-100 bg-${color}-50 p-3`}>
      <p className={`text-xs font-semibold text-${color}-700 uppercase tracking-wide`}>Vincular {label}</p>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="w-3 h-3 animate-spin" /> Carregando…
        </div>
      ) : (
        <Select value={selectedId} onValueChange={v => { setSelectedId(v); onSelect(v || null) }}>
          <SelectTrigger className="bg-white text-sm h-8">
            <SelectValue placeholder={`— Selecionar conjunto de ${label.toLowerCase()} —`} />
          </SelectTrigger>
          <SelectContent>
            {options.length === 0 && (
              <SelectItem value="__none" disabled>Nenhum conjunto disponível</SelectItem>
            )}
            {options.map(o => (
              <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

// ── Edit topic dialog ──────────────────────────────────────────────────────────

type TopicSaveData = {
  title: string
  type: string
  estimatedMinutes: number
  apostilaId?: string
  uploadFile?: File
  exerciseSetId?: string
  flashcardSetId?: string
}

function EditTopicDialog({
  topic,
  open,
  onClose,
  onSave,
}: {
  topic: Topic
  open: boolean
  onClose: () => void
  onSave: (data: TopicSaveData) => Promise<void>
}) {
  const [title, setTitle] = useState(topic.title)
  const [type, setType] = useState(topic.type)
  const [minutes, setMinutes] = useState(topic.estimatedMinutes ?? 45)
  const [apostilaId, setApostilaId] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [exerciseSetId, setExerciseSetId] = useState<string | null>(null)
  const [flashcardSetId, setFlashcardSetId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave({
      title,
      type,
      estimatedMinutes: minutes,
      apostilaId: apostilaId ?? undefined,
      uploadFile: uploadFile ?? undefined,
      exerciseSetId: exerciseSetId ?? undefined,
      flashcardSetId: flashcardSetId ?? undefined,
    })
    setSaving(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Atividade</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={v => { setType(v); setExerciseSetId(null); setFlashcardSetId(null); setApostilaId(null); setUploadFile(null) }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOPIC_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Duração (minutos)</Label>
            <Input
              type="number"
              min={5}
              max={480}
              value={minutes}
              onChange={e => setMinutes(parseInt(e.target.value) || 30)}
            />
          </div>
          {type === 'apostila' && (
            <ApostilaPicker
              topicTitle={title}
              onSelect={(id, file) => { setApostilaId(id); setUploadFile(file) }}
            />
          )}
          {type === 'exercise' && (
            <ContentPicker type="exercise" onSelect={id => setExerciseSetId(id)} />
          )}
          {type === 'flashcard' && (
            <ContentPicker type="flashcard" onSelect={id => setFlashcardSetId(id)} />
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Add topic dialog ───────────────────────────────────────────────────────────

function AddTopicDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (data: TopicSaveData) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('apostila')
  const [minutes, setMinutes] = useState(45)
  const [apostilaId, setApostilaId] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [exerciseSetId, setExerciseSetId] = useState<string | null>(null)
  const [flashcardSetId, setFlashcardSetId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!title.trim()) return
    setSaving(true)
    await onAdd({
      title,
      type,
      estimatedMinutes: minutes,
      apostilaId: apostilaId ?? undefined,
      uploadFile: uploadFile ?? undefined,
      exerciseSetId: exerciseSetId ?? undefined,
      flashcardSetId: flashcardSetId ?? undefined,
    })
    setSaving(false)
    setTitle('')
    setType('apostila')
    setMinutes(45)
    setApostilaId(null)
    setUploadFile(null)
    setExerciseSetId(null)
    setFlashcardSetId(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Atividade</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              placeholder="Ex: Contratos de Compra e Venda"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={v => { setType(v); setExerciseSetId(null); setFlashcardSetId(null); setApostilaId(null); setUploadFile(null) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TOPIC_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Duração (minutos)</Label>
            <Input
              type="number"
              min={5}
              max={480}
              value={minutes}
              onChange={e => setMinutes(parseInt(e.target.value) || 30)}
            />
          </div>
          {type === 'apostila' && (
            <ApostilaPicker
              topicTitle={title}
              onSelect={(id, file) => { setApostilaId(id); setUploadFile(file) }}
            />
          )}
          {type === 'exercise' && (
            <ContentPicker type="exercise" onSelect={id => setExerciseSetId(id)} />
          )}
          {type === 'flashcard' && (
            <ContentPicker type="flashcard" onSelect={id => setFlashcardSetId(id)} />
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAdd} disabled={saving || !title.trim()}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Day row ────────────────────────────────────────────────────────────────────

function DayRow({ day, onRefresh }: { day: Day; onRefresh: () => void }) {
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)
  const [addingTopic, setAddingTopic] = useState(false)

  async function handleUpdateTopic(topicId: string, data: TopicSaveData) {
    const contentPatch: Record<string, string | null> = {}
    if (data.exerciseSetId) contentPatch.exerciseSetId = data.exerciseSetId
    if (data.flashcardSetId) contentPatch.flashcardSetId = data.flashcardSetId

    const result = await updateTrainingTopic(topicId, {
      title: data.title,
      type: data.type,
      estimatedMinutes: data.estimatedMinutes,
      ...(Object.keys(contentPatch).length > 0 && { contentPatch }),
    })
    if ('error' in result) { toast.error('Erro ao salvar'); return }

    if (data.apostilaId) {
      await linkApostilaToTopic(data.apostilaId, topicId)
    } else if (data.uploadFile) {
      const fd = new FormData()
      fd.append('title', data.title)
      fd.append('files', data.uploadFile)
      const res = await createApostilaForTopic(topicId, fd)
      if ('error' in res) toast.error(`Erro ao gerar apostila: ${res.error}`)
    }

    toast.success('Atividade atualizada')
    onRefresh()
  }

  async function handleDeleteTopic(topicId: string) {
    const result = await deleteTrainingTopic(topicId)
    if ('error' in result) toast.error('Erro ao excluir')
    else { toast.success('Atividade removida'); onRefresh() }
  }

  async function handleAddTopic(data: TopicSaveData) {
    const nextOrder = (day.topics.at(-1)?.order ?? 0) + 1
    const result = await addTrainingTopic(day.id, { ...data, order: nextOrder })
    if ('error' in result) { toast.error('Erro ao adicionar'); return }

    if (data.apostilaId) {
      await linkApostilaToTopic(data.apostilaId, result.id)
    } else if (data.uploadFile) {
      const fd = new FormData()
      fd.append('title', data.title)
      fd.append('files', data.uploadFile)
      const res = await createApostilaForTopic(result.id, fd)
      if ('error' in res) toast.error(`Erro ao gerar apostila: ${res.error}`)
    }

    if (data.exerciseSetId || data.flashcardSetId) {
      const contentPatch: Record<string, string | null> = {}
      if (data.exerciseSetId) contentPatch.exerciseSetId = data.exerciseSetId
      if (data.flashcardSetId) contentPatch.flashcardSetId = data.flashcardSetId
      await updateTrainingTopic(result.id, { contentPatch })
    }

    toast.success('Atividade adicionada')
    onRefresh()
  }

  const dateStr = day.date
    ? new Date(day.date + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    : null

  return (
    <AccordionItem value={day.id} className="border rounded-xl overflow-hidden">
      <AccordionTrigger className="px-4 hover:no-underline hover:bg-gray-50">
        <div className="flex items-center gap-3 text-left w-full">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {day.dayNumber}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 truncate">{day.title}</p>
            <p className="text-xs text-gray-400">
              {dateStr && <span className="mr-2">{dateStr}</span>}
              {day.topics.length} atividades · {day.estimatedHours}h estimadas
            </p>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-4 pb-4">
        {day.description && (
          <p className="text-sm text-gray-600 mb-3">{day.description}</p>
        )}

        <div className="space-y-2">
          {day.topics.map(topic => (
            <div
              key={topic.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group"
            >
              <span className="text-lg flex-shrink-0">{topicIcon(topic.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{topic.title}</p>
                <p className="text-xs text-gray-400">
                  {topicLabel(topic.type)} · {topic.estimatedMinutes ?? 30} min
                </p>
              </div>
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {topicLabel(topic.type)}
              </Badge>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={e => { e.stopPropagation(); setEditingTopic(topic) }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-600"
                  onClick={e => { e.stopPropagation(); handleDeleteTopic(topic.id) }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-gray-400 hover:text-gray-600 border border-dashed"
            onClick={() => setAddingTopic(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Adicionar atividade
          </Button>
        </div>

        {editingTopic && (
          <EditTopicDialog
            topic={editingTopic}
            open={true}
            onClose={() => setEditingTopic(null)}
            onSave={data => handleUpdateTopic(editingTopic.id, data)}
          />
        )}
        <AddTopicDialog
          open={addingTopic}
          onClose={() => setAddingTopic(false)}
          onAdd={handleAddTopic}
        />
      </AccordionContent>
    </AccordionItem>
  )
}

// ── Main editor ────────────────────────────────────────────────────────────────

export function TrainingEditor({ training, versions }: TrainingEditorProps) {
  const [generatingAI, setGeneratingAI] = useState(false)
  const router = useRouter()

  async function generateWithAI() {
    setGeneratingAI(true)
    toast.info('Gerando cronograma com IA… isso pode levar alguns minutos')

    const result = await generateTrainingWithAI(training.id)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Cronograma gerado com sucesso!')
      router.refresh()
    }
    setGeneratingAI(false)
  }

  const hasDays = training.days && training.days.length > 0

  return (
    <Tabs defaultValue="schedule">
      <TabsList>
        <TabsTrigger value="schedule">
          <Calendar className="w-4 h-4 mr-1.5" />
          Cronograma
        </TabsTrigger>
        <TabsTrigger value="info">Informações</TabsTrigger>
        <TabsTrigger value="versions">Versões ({versions.length})</TabsTrigger>
      </TabsList>

      {/* ── Schedule tab ─────────────────────────────────────────────────── */}
      <TabsContent value="schedule" className="mt-4 space-y-4">
        {!hasDays && (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
                <Wand2 className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Nenhum cronograma gerado</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Clique abaixo para gerar o cronograma completo com IA
                </p>
              </div>
              <Button onClick={generateWithAI} disabled={generatingAI} size="lg">
                {generatingAI
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <Zap className="w-4 h-4 mr-2" />}
                {generatingAI ? 'Gerando…' : 'Gerar com IA'}
              </Button>
            </CardContent>
          </Card>
        )}

        {hasDays && (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {training.days!.length} dias úteis programados
              </p>
              <Button variant="outline" size="sm" onClick={generateWithAI} disabled={generatingAI}>
                {generatingAI
                  ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  : <Wand2 className="w-4 h-4 mr-1" />}
                Regenerar com IA
              </Button>
            </div>

            <Accordion type="multiple" className="space-y-2">
              {training.days!.map(day => (
                <DayRow
                  key={day.id}
                  day={day}
                  onRefresh={() => router.refresh()}
                />
              ))}
            </Accordion>
          </>
        )}
      </TabsContent>

      {/* ── Info tab ─────────────────────────────────────────────────────── */}
      <TabsContent value="info" className="mt-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoItem label="Duração" value={`${training.daysCount} dias`} />
              <InfoItem label="Horas/dia" value={`${training.hoursPerDay}h`} />
              <InfoItem label="Início" value={formatDate(training.startDate)} />
              <InfoItem label="Fim" value={formatDate(training.endDate)} />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Versions tab ─────────────────────────────────────────────────── */}
      <TabsContent value="versions" className="mt-4">
        <Card>
          <CardContent className="p-6">
            {versions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Nenhuma versão salva ainda
              </p>
            ) : (
              <div className="space-y-2">
                {versions.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Versão {v.versionNumber}</p>
                      <p className="text-xs text-gray-400">
                        {v.changesDescription || 'Sem descrição'} · {formatDate(v.changedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="font-semibold text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}
