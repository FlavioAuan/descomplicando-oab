import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Ebook cover in book proportions; a styled placeholder when there's no image. */
export function EbookCover({ title, coverUrl, className }: { title: string; coverUrl: string | null; className?: string }) {
  return (
    <div className={cn('aspect-[0.707] rounded-md overflow-hidden shadow-sm border bg-gray-900', className)}>
      {coverUrl ? (
        <img src={coverUrl} alt={`Capa: ${title}`} loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4 text-center">
          <BookOpen className="w-8 h-8" style={{ color: '#C9A227' }} />
          <span className="text-sm font-semibold text-white line-clamp-4">{title}</span>
        </div>
      )}
    </div>
  )
}
