'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { startCheckout } from '@/server/actions/sales'

type Props = {
  label: string
  className?: string
  variant?: 'default' | 'outline'
} & ({ kind: 'lifetime' } | { kind: 'training'; trainingId: string } | { kind: 'ebook'; ebookId: string })

/** Creates the order and sends the student to the Mercado Pago checkout. */
export function BuyButton({ label, className, variant = 'default', ...item }: Props) {
  const [loading, setLoading] = useState(false)

  async function buy() {
    setLoading(true)
    const result = await startCheckout(
      item.kind === 'lifetime'
        ? { kind: 'lifetime' }
        : item.kind === 'ebook'
          ? { kind: 'ebook', ebookId: item.ebookId }
          : { kind: 'training', trainingId: item.trainingId },
    )
    if ('error' in result) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    window.location.href = result.url
  }

  return (
    <Button onClick={buy} disabled={loading} variant={variant} className={className}>
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {label}
    </Button>
  )
}
