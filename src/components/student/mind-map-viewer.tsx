import { Card, CardContent } from '@/components/ui/card'
import { Download, Maximize2 } from 'lucide-react'

type MindMap = { title: string; chapter: number | null; imageUrl: string; pdfUrl: string | null }

export function MindMapViewer({ mindMap }: { mindMap: MindMap }) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <a
            href={mindMap.imageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:underline"
          >
            <Maximize2 className="w-4 h-4" /> Abrir em tela cheia
          </a>
          {mindMap.pdfUrl && (
            <a href={mindMap.pdfUrl} download className="inline-flex items-center gap-2 text-blue-600 hover:underline">
              <Download className="w-4 h-4" /> Baixar PDF com todos os mapas
            </a>
          )}
        </div>
        <a href={mindMap.imageUrl} target="_blank" rel="noreferrer" className="block overflow-x-auto rounded-lg border">
          <img
            src={mindMap.imageUrl}
            alt={`Mapa mental${mindMap.chapter ? ` do capítulo ${mindMap.chapter}` : ''}: ${mindMap.title}`}
            className="w-full min-w-[720px] h-auto"
          />
        </a>
      </CardContent>
    </Card>
  )
}
