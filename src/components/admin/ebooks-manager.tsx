'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EbookCover } from '@/components/ebook-cover'
import { formatBRL } from '@/lib/money'
import { deleteEbook } from '@/server/actions/ebooks'

type Option = { id: string; name: string }

type AdminEbook = {
  id: string
  title: string
  description: string | null
  subjectId: string | null
  trainingId: string | null
  priceCents: number | null
  coverUrl: string | null
  sizeBytes: number | null
  pageCount: number | null
  order: number
  sold: number
}

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function EbooksManager({ ebooks, trainings, subjects }: { ebooks: AdminEbook[]; trainings: Option[]; subjects: Option[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<AdminEbook | 'new' | null>(null)
  const [saving, setSaving] = useState(false)
  const current = editing === 'new' ? null : editing
  const trainingName = (id: string | null) => trainings.find(t => t.id === id)?.name

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    if (current) form.set('id', current.id)
    try {
      const res = await fetch('/api/admin/ebooks', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`)
      toast.success(current ? 'Ebook atualizado' : 'Ebook publicado')
      setEditing(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function remove(ebook: AdminEbook) {
    const warning = ebook.sold
      ? `"${ebook.title}" já foi vendido ${ebook.sold} vez(es) e quem comprou perderá o acesso. Excluir mesmo assim?`
      : `Excluir "${ebook.title}"?`
    if (!window.confirm(warning)) return
    const result = await deleteEbook(ebook.id)
    if ('error' in result) return toast.error(result.error)
    toast.success('Ebook excluído')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => setEditing('new')}>
        <Plus className="w-4 h-4 mr-2" /> Novo ebook
      </Button>

      {ebooks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-500">Nenhum ebook cadastrado.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ebooks.map(ebook => (
            <Card key={ebook.id}>
              <CardContent className="p-4 flex gap-4">
                <EbookCover title={ebook.title} coverUrl={ebook.coverUrl} className="w-24 flex-shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="font-semibold text-gray-900">{ebook.title}</p>
                  <p className="text-sm">
                    {ebook.priceCents ? (
                      <span className="font-semibold text-gray-900">{formatBRL(ebook.priceCents)}</span>
                    ) : (
                      <span className="text-gray-500">Não vendido avulso</span>
                    )}
                    {ebook.sold > 0 && <span className="text-gray-500"> · {ebook.sold} vendido(s)</span>}
                  </p>
                  {ebook.trainingId && (
                    <Badge variant="outline" className="text-xs font-normal">
                      Liberado com: {trainingName(ebook.trainingId) ?? 'treinamento'}
                    </Badge>
                  )}
                  <p className="text-xs text-gray-400">
                    PDF{ebook.pageCount ? ` · ${ebook.pageCount} páginas` : ''}
                    {ebook.sizeBytes ? ` · ${(ebook.sizeBytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB` : ''}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(ebook)}>
                      <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
                    </Button>
                    <a href={`/api/ebooks/${ebook.id}/file`} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline">Abrir PDF</Button>
                    </a>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => remove(ebook)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={open => !open && !saving && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{current ? 'Editar ebook' : 'Novo ebook'}</DialogTitle>
          </DialogHeader>
          {/* key: reset the uncontrolled fields when switching between ebooks */}
          <form key={current?.id ?? 'new'} onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="eb-title">Título</Label>
              <Input id="eb-title" name="title" required defaultValue={current?.title} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eb-description">Descrição</Label>
              <Textarea id="eb-description" name="description" rows={3} defaultValue={current?.description ?? ''} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="eb-price">Preço (R$)</Label>
                <Input
                  id="eb-price"
                  name="price"
                  inputMode="decimal"
                  placeholder="ex.: 49,90"
                  defaultValue={current?.priceCents ? (current.priceCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                />
                <p className="text-xs text-gray-500">Em branco = não vendido avulso.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eb-order">Ordem na vitrine</Label>
                <Input id="eb-order" name="order" type="number" defaultValue={current?.order ?? 0} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eb-training">Treinamento vinculado</Label>
              <select id="eb-training" name="trainingId" className={selectClass} defaultValue={current?.trainingId ?? ''}>
                <option value="">— Nenhum —</option>
                {trainings.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500">Quem compra este treinamento recebe o ebook sem pagar a mais.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eb-subject">Disciplina</Label>
              <select id="eb-subject" name="subjectId" className={selectClass} defaultValue={current?.subjectId ?? ''}>
                <option value="">— Nenhuma —</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eb-pdf">Arquivo PDF{current ? ' (envie só para trocar)' : ''}</Label>
              <Input id="eb-pdf" name="pdf" type="file" accept="application/pdf,.pdf" required={!current} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eb-cover">Capa (JPG, PNG ou WEBP){current?.coverUrl ? ' — envie só para trocar' : ' — opcional'}</Label>
              <Input id="eb-cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {saving ? 'Enviando…' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
