'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Copy, Loader2, PlugZap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { removeMercadoPagoSettings, saveMercadoPagoSettings, testMercadoPagoConnection } from '@/server/actions/sales'

type Props = {
  accessTokenMask: string
  webhookSecretMask: string
  accessTokenFromEnv: boolean
  webhookSecretFromEnv: boolean
  isTestToken: boolean
  webhookUrl: string
}

export function MercadoPagoSettingsForm(props: Props) {
  const router = useRouter()
  const [accessToken, setAccessToken] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [busy, setBusy] = useState<'save' | 'test' | 'remove' | null>(null)
  const configured = Boolean(props.accessTokenMask)

  async function save() {
    setBusy('save')
    const result = await saveMercadoPagoSettings({ accessToken, webhookSecret })
    setBusy(null)
    if ('error' in result) return toast.error(result.error)
    toast.success('Configuração do Mercado Pago salva')
    setAccessToken('')
    setWebhookSecret('')
    router.refresh()
  }

  async function test() {
    setBusy('test')
    const result = await testMercadoPagoConnection()
    setBusy(null)
    if ('error' in result) toast.error(result.error)
    else toast.success(`Conectado: ${result.account}`)
  }

  async function remove() {
    if (!window.confirm('Remover as credenciais do Mercado Pago? As vendas ficarão indisponíveis.')) return
    setBusy('remove')
    await removeMercadoPagoSettings()
    setBusy(null)
    toast.success('Credenciais removidas')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">Integração com o Mercado Pago</CardTitle>
          {configured ? (
            <Badge className={props.isTestToken ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}>
              {props.isTestToken ? 'Credenciais de teste' : 'Ativo'}
            </Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-600">Não configurado</Badge>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Em <span className="font-medium">mercadopago.com.br/developers → Suas integrações → sua aplicação → Credenciais de produção</span>,
          copie o <span className="font-medium">Access Token</span>.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="mp-token">Access Token</Label>
          {props.accessTokenFromEnv ? (
            <p className="text-sm text-gray-600">Definido pela variável de ambiente MERCADOPAGO_ACCESS_TOKEN ({props.accessTokenMask}).</p>
          ) : (
            <Input
              id="mp-token"
              type="password"
              autoComplete="off"
              placeholder={configured ? `Salvo (${props.accessTokenMask}) — cole outro para trocar` : 'APP_USR-…'}
              value={accessToken}
              onChange={e => setAccessToken(e.target.value)}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>URL de notificações (Webhook)</Label>
          <div className="flex gap-2">
            <Input readOnly value={props.webhookUrl} className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              onClick={() => { navigator.clipboard.writeText(props.webhookUrl); toast.success('URL copiada') }}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Na sua aplicação do Mercado Pago, abra <span className="font-medium">Webhooks → Configurar notificações</span>, cole esta URL
            no modo produção, marque o evento <span className="font-medium">Pagamentos</span> e salve. Depois copie a
            <span className="font-medium"> assinatura secreta</span> gerada e cole abaixo.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mp-secret">Assinatura secreta do Webhook</Label>
          {props.webhookSecretFromEnv ? (
            <p className="text-sm text-gray-600">Definida pela variável de ambiente MERCADOPAGO_WEBHOOK_SECRET ({props.webhookSecretMask}).</p>
          ) : (
            <Input
              id="mp-secret"
              type="password"
              autoComplete="off"
              placeholder={props.webhookSecretMask ? `Salva (${props.webhookSecretMask}) — cole outra para trocar` : 'Opcional, mas recomendado'}
              value={webhookSecret}
              onChange={e => setWebhookSecret(e.target.value)}
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {!(props.accessTokenFromEnv && props.webhookSecretFromEnv) && (
            <Button onClick={save} disabled={busy !== null || (!accessToken && !webhookSecret)}>
              {busy === 'save' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          )}
          <Button variant="outline" onClick={test} disabled={busy !== null || !configured}>
            {busy === 'test' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlugZap className="w-4 h-4 mr-2" />}
            Testar conexão
          </Button>
          {configured && !props.accessTokenFromEnv && (
            <Button variant="outline" onClick={remove} disabled={busy !== null} className="text-red-600 hover:text-red-700">
              Remover credenciais
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
