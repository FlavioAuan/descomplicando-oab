import { Metadata } from 'next'
import { AuthCardPage } from '@/components/auth/auth-card-page'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = { title: 'Esqueci minha senha' }

export default function ForgotPasswordPage() {
  return (
    <AuthCardPage
      title="Esqueceu sua senha?"
      subtitle="Informe o email da sua conta e enviaremos um link para criar uma nova senha."
    >
      <ForgotPasswordForm />
    </AuthCardPage>
  )
}
