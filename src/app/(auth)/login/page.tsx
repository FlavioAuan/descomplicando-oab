import { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Entrar' }

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-oab-dark to-oab-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-oab-gold rounded-xl flex items-center justify-center mx-auto mb-4 text-3xl">
            ⚖
          </div>
          <h1 className="text-2xl font-bold text-white">DescomplicandOAB</h1>
          <p className="text-blue-300 mt-1">Entre na sua conta</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <LoginForm />
          <p className="text-center text-sm text-gray-500 mt-6">
            Não tem conta?{' '}
            <Link href="/register" className="text-blue-600 hover:underline font-medium">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
