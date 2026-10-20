import { Metadata } from 'next'
import Link from 'next/link'
import { AuthCardPage } from '@/components/auth/auth-card-page'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export const metadata: Metadata = { title: 'Nova senha' }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  return (
    <AuthCardPage title="Criar nova senha" subtitle="Escolha uma nova senha para acessar sua conta.">
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-sm text-gray-600 text-center">
          Link inválido.{' '}
          <Link href="/forgot-password" className="font-semibold hover:underline" style={{ color: '#C9A227' }}>
            Peça um novo link
          </Link>
          .
        </p>
      )}
    </AuthCardPage>
  )
}
