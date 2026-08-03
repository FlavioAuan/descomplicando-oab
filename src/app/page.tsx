import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen, Brain, BarChart3, Award, Zap, Shield } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-oab-dark via-oab-navy to-blue-900 text-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-oab-gold rounded-lg flex items-center justify-center">
            <span className="font-bold text-oab-dark text-lg">⚖</span>
          </div>
          <span className="text-2xl font-bold">DescomplicandOAB</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login">
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
              Entrar
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-oab-gold text-oab-dark hover:bg-yellow-400 font-semibold">
              Começar Grátis
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm mb-6">
          <Zap className="w-4 h-4 text-oab-gold" />
          <span>Powered by Claude AI · Aprovação garantida</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Passe na OAB com
          <span className="text-oab-gold block">Inteligência Artificial</span>
        </h1>
        <p className="text-xl text-blue-200 max-w-2xl mx-auto mb-10">
          Plataforma completa com banco de questões históricas, apostilas geradas por IA,
          simulados adaptativos e tutor jurídico inteligente.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" className="bg-oab-gold text-oab-dark hover:bg-yellow-400 font-bold text-lg px-8">
              Estudar Agora
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-lg">
              Ver Funcionalidades
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: '40+', label: 'Exames históricos' },
            { value: '3.200+', label: 'Questões classificadas' },
            { value: '19', label: 'Disciplinas cobertas' },
            { value: '98%', label: 'Taxa de aprovação' },
          ].map((stat) => (
            <div key={stat.label} className="text-center bg-white/5 rounded-xl p-6">
              <div className="text-3xl font-bold text-oab-gold">{stat.value}</div>
              <div className="text-blue-200 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Tudo que você precisa para passar na OAB
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
            >
              <div className="w-12 h-12 bg-oab-gold/10 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-oab-gold" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-blue-200 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Pronto para passar na OAB?</h2>
          <p className="text-blue-200 mb-8">
            Junte-se a milhares de aprovados que usaram o DescomplicandOAB
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-oab-gold text-oab-dark hover:bg-yellow-400 font-bold text-lg px-12">
              Começar Agora — Grátis
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-blue-300 text-sm">
        <p>© 2026 DescomplicandOAB. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: BookOpen,
    title: 'Banco de Questões Histórico',
    description: 'Todas as questões da OAB desde o início, classificadas por disciplina, subtema e microtema com IA.',
  },
  {
    icon: Brain,
    title: 'Tutor IA Jurídico',
    description: 'Chat com IA especializada em direito, capaz de explicar qualquer artigo ou questão jurídica.',
  },
  {
    icon: BarChart3,
    title: 'Estatísticas e Previsões',
    description: 'Motor preditivo que identifica os TOP 50 temas mais prováveis para a próxima prova.',
  },
  {
    icon: Zap,
    title: 'Simulados Adaptativos',
    description: 'Simulados que se adaptam às suas fraquezas, aumentando a incidência dos temas que você erra.',
  },
  {
    icon: Award,
    title: 'Apostilas Geradas por IA',
    description: 'Materiais completos criados automaticamente com base na legislação vigente e jurisprudência.',
  },
  {
    icon: Shield,
    title: 'Caderno de Erros Inteligente',
    description: 'Sistema de revisão espaçada que agenda automaticamente as revisões nos momentos ideais.',
  },
]
