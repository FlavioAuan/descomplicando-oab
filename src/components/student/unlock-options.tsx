import { Card, CardContent } from '@/components/ui/card'
import { Crown, Lock, Sparkles } from 'lucide-react'
import { formatBRL } from '@/lib/money'
import { BuyButton } from './buy-button'

type Props = {
  trainingId: string
  trainingName: string
  priceCents: number | null | undefined
  lifetime: { enabled: boolean; priceCents: number }
  title?: string
  compact?: boolean
  /** 'lesson': shown in place of a single lesson, with a softer, purchase-oriented message */
  variant?: 'banner' | 'lesson'
}

/** What a free user sees in place of locked lessons: buy the training or the lifetime plan. */
export function UnlockOptions({ trainingId, trainingName, priceCents, lifetime, title, compact, variant = 'banner' }: Props) {
  const canBuyTraining = Boolean(priceCents)
  const Icon = variant === 'lesson' ? Sparkles : Lock

  let message: string
  if (variant === 'lesson') {
    message = canBuyTraining && lifetime.enabled
      ? 'Esta aula faz parte do treinamento completo. Compre este treinamento ou assine o plano vitalício para continuar.'
      : canBuyTraining
        ? 'Esta aula faz parte do treinamento completo. Compre este treinamento para continuar.'
        : lifetime.enabled
          ? 'Esta aula faz parte do treinamento completo. Assine o plano vitalício para continuar.'
          : 'Esta aula faz parte do treinamento completo, que estará disponível para compra em breve.'
  } else {
    message = 'Na conta gratuita você tem acesso à aula inicial de cada treinamento.' + (
      canBuyTraining || lifetime.enabled
        ? ' Para liberar todas as aulas, escolha uma opção:'
        : ' As demais aulas estarão à venda em breve.'
    )
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className={compact ? 'p-4 space-y-3' : 'p-6 space-y-4'}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{title ?? 'Conteúdo exclusivo para alunos'}</p>
            <p className="text-sm text-gray-600 mt-0.5">{message}</p>
          </div>
        </div>

        {(canBuyTraining || lifetime.enabled) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {canBuyTraining && (
              <div className="rounded-lg bg-white border p-4 flex flex-col gap-3">
                <div>
                  <p className="text-xs text-gray-500">Somente este treinamento</p>
                  <p className="text-sm font-medium text-gray-800 line-clamp-2">{trainingName}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatBRL(priceCents!)}</p>
                </div>
                <BuyButton kind="training" trainingId={trainingId} label="Comprar treinamento" className="mt-auto w-full" />
              </div>
            )}
            {lifetime.enabled && (
              <div className="rounded-lg border-2 p-4 flex flex-col gap-3" style={{ borderColor: '#C9A227', backgroundColor: '#FFFBEB' }}>
                <div>
                  <p className="text-xs font-semibold flex items-center gap-1" style={{ color: '#92400E' }}>
                    <Crown className="w-3.5 h-3.5" /> PLANO VITALÍCIO
                  </p>
                  <p className="text-sm font-medium text-gray-800">Todas as aulas de todos os treinamentos, para sempre</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatBRL(lifetime.priceCents)}</p>
                  <p className="text-xs text-gray-500">pagamento único</p>
                </div>
                <BuyButton kind="lifetime" label="Assinar plano vitalício" className="mt-auto w-full" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
