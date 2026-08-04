import { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'
import { Scale, BookOpen, Brain, Trophy } from 'lucide-react'

export const metadata: Metadata = { title: 'Entrar' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: '#111827' }}
      >
        {/* Subtle pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #C9A227 0, #C9A227 1px, transparent 0, transparent 50%)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#C9A227' }}
          >
            <Scale className="w-5 h-5 text-gray-900" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">DescomplicandOAB</div>
            <div className="text-xs leading-tight" style={{ color: '#C9A227' }}>
              Treinamento para o Exame da Ordem
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative">
          <div
            className="w-12 h-0.5 mb-6"
            style={{ backgroundColor: '#C9A227' }}
          />
          <h2 className="text-4xl font-bold text-white leading-snug mb-4">
            Sua aprovação na OAB começa aqui.
          </h2>
          <p className="text-gray-400 text-base leading-relaxed mb-10">
            Treinamento estruturado com todas as provas históricas, simulados por disciplina e análise de incidência de temas.
          </p>

          <div className="space-y-4">
            {[
              { icon: BookOpen, text: 'Todas as 46 provas da OAB catalogadas e organizadas' },
              { icon: Brain, text: 'Flashcards e revisão espaçada para fixar o conteúdo' },
              { icon: Trophy, text: 'Simulados com estatísticas de desempenho por disciplina' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#C9A22720' }}
                >
                  <Icon className="w-4 h-4" style={{ color: '#C9A227' }} />
                </div>
                <span className="text-gray-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-gray-600">
          © {new Date().getFullYear()} DescomplicandOAB. Todos os direitos reservados.
        </div>
      </div>

      {/* Right panel — form */}
      <div className="relative flex-1 flex flex-col items-center justify-center bg-gray-50 px-6 py-12">
        {/* Back link */}
        <div className="absolute top-5 right-6 lg:top-5 lg:right-6">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors"
          >
            ← Página inicial
          </Link>
        </div>

        {/* Mobile logo */}
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#C9A227' }}
          >
            <Scale className="w-5 h-5 text-gray-900" />
          </div>
          <span className="font-bold text-gray-900 text-lg">DescomplicandOAB</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Bem-vindo de volta</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Entre na sua conta para continuar estudando
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <LoginForm />
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Não tem conta?{' '}
            <Link
              href="/register"
              className="font-semibold hover:underline"
              style={{ color: '#C9A227' }}
            >
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
