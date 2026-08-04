import { Metadata } from 'next'
import Link from 'next/link'
import { RegisterForm } from '@/components/auth/register-form'
import { Scale, ShieldCheck, Clock, Target } from 'lucide-react'

export const metadata: Metadata = { title: 'Criar conta' }

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: '#111827' }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #C9A227 0, #C9A227 1px, transparent 0, transparent 50%)',
            backgroundSize: '20px 20px',
          }}
        />

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

        <div className="relative">
          <div className="w-12 h-0.5 mb-6" style={{ backgroundColor: '#C9A227' }} />
          <h2 className="text-4xl font-bold text-white leading-snug mb-4">
            Comece a sua jornada rumo à aprovação.
          </h2>
          <p className="text-gray-400 text-base leading-relaxed mb-10">
            Acesse todas as provas históricas da OAB, treine com simulados e acompanhe sua evolução por disciplina.
          </p>

          <div className="space-y-4">
            {[
              { icon: ShieldCheck, text: 'Criação de conta gratuita, sem cartão de crédito' },
              { icon: Clock, text: 'Acesso imediato a todas as provas históricas da OAB' },
              { icon: Target, text: 'Estatísticas de incidência para priorizar seus estudos' },
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
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-6 py-12">
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
            <h1 className="text-2xl font-bold text-gray-900">Criar conta grátis</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Preencha os dados abaixo para começar
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <RegisterForm />
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Já tem conta?{' '}
            <Link
              href="/login"
              className="font-semibold hover:underline"
              style={{ color: '#C9A227' }}
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
