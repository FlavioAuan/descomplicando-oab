import Link from 'next/link'
import { Scale } from 'lucide-react'

// Centered single-card layout for the secondary auth screens (password reset)
export function AuthCardPage({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 py-12">
      <Link href="/" className="flex items-center gap-3 mb-10">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#C9A227' }}>
          <Scale className="w-5 h-5 text-gray-900" />
        </div>
        <span className="font-bold text-gray-900 text-lg">DescomplicandOAB</span>
      </Link>

      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500 mt-1 text-sm">{subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">{children}</div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Lembrou a senha?{' '}
          <Link href="/login" className="font-semibold hover:underline" style={{ color: '#C9A227' }}>
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  )
}
