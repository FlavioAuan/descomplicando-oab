import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen, ClipboardList, BarChart3, Award, Target, Shield, Scale } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-oab-dark via-oab-navy to-blue-900 text-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-oab-gold rounded-lg flex items-center justify-center">
            <Scale className="w-5 h-5 text-oab-dark" />
          </div>
          <span className="text-xl font-bold tracking-tight">DescomplicandOAB</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login">
            <Button variant="outline" className="border-oab-gold/60 text-oab-gold hover:bg-oab-gold/10 hover:border-oab-gold">
              Entrar
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-oab-gold text-oab-dark hover:bg-yellow-400 font-semibold">
              Começar Agora
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm mb-6 border border-white/10">
          <Scale className="w-4 h-4 text-oab-gold" />
          <span className="text-white/80">Método completo de preparação para o Exame da Ordem</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Treinamento completo
          <span className="text-oab-gold block">para a OAB 1ª Fase</span>
        </h1>
        <p className="text-xl text-blue-200 max-w-2xl mx-auto mb-10">
          Estude com todas as provas históricas da OAB, simulados adaptativos,
          flashcards e estatísticas que mostram exatamente onde focar.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" className="bg-oab-gold text-oab-dark hover:bg-yellow-400 font-bold text-lg px-8">
              Começar Treinamento
            </Button>
          </Link>
          <Link href="#recursos">
            <Button size="lg" variant="outline" className="border-oab-gold/60 text-oab-gold hover:bg-oab-gold/10 hover:border-oab-gold text-lg">
              Ver Recursos
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: '46', label: 'Exames históricos' },
            { value: '3.680+', label: 'Questões catalogadas' },
            { value: '19', label: 'Disciplinas cobertas' },
            { value: '100%', label: 'Conteúdo oficial OAB' },
          ].map((stat) => (
            <div key={stat.label} className="text-center bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="text-3xl font-bold text-oab-gold">{stat.value}</div>
              <div className="text-blue-200 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">
            Tudo que você precisa para passar na OAB
          </h2>
          <p className="text-blue-200 max-w-xl mx-auto">
            Um método estruturado com as ferramentas certas para cada fase do seu estudo.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/8 hover:border-oab-gold/30 transition-all duration-200"
            >
              <div className="w-12 h-12 bg-oab-gold/10 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-oab-gold" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-blue-200 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Disciplines */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-10">
          <h2 className="text-2xl font-bold text-center mb-2">19 Disciplinas cobertas</h2>
          <p className="text-blue-200 text-center text-sm mb-8">Todo o conteúdo cobrado no Exame da Ordem</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {disciplines.map(d => (
              <span
                key={d}
                className="px-3 py-1.5 bg-white/8 border border-white/10 rounded-full text-sm text-blue-100"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="bg-oab-gold/10 border border-oab-gold/30 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-3">Pronto para começar seu treinamento?</h2>
          <p className="text-blue-200 mb-8 max-w-lg mx-auto">
            Acesse todas as provas históricas da OAB, resolva questões e acompanhe sua evolução.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-oab-gold text-oab-dark hover:bg-yellow-400 font-bold text-lg px-12">
              Criar conta gratuita
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-blue-300 text-sm">
        <p>© {new Date().getFullYear()} DescomplicandOAB. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: BookOpen,
    title: 'Banco de Questões Histórico',
    description: 'Todas as 46 provas da OAB 1ª Fase catalogadas e organizadas por disciplina, subtema e grau de dificuldade.',
  },
  {
    icon: ClipboardList,
    title: 'Simulados por Tema',
    description: 'Pratique com simulados focados nas disciplinas que você mais precisa, no formato real do exame.',
  },
  {
    icon: BarChart3,
    title: 'Estatísticas e Previsões',
    description: 'Veja quais disciplinas têm maior incidência histórica e quais temas têm mais chance de cair na próxima prova.',
  },
  {
    icon: Target,
    title: 'Caderno de Erros',
    description: 'Acompanhe todas as questões que errou e revise com frequência para transformar fraquezas em acertos.',
  },
  {
    icon: Award,
    title: 'Material de Apoio',
    description: 'Apostilas completas por disciplina, organizadas conforme o programa oficial do Exame da Ordem.',
  },
  {
    icon: Shield,
    title: 'Revisão Espaçada',
    description: 'Sistema de flashcards com revisão programada para fixar o conteúdo e manter o que você estudou.',
  },
]

const disciplines = [
  'Ética Profissional', 'Direito Constitucional', 'Direito Civil', 'Direito Processual Civil',
  'Direito Penal', 'Direito Processual Penal', 'Direito do Trabalho', 'Direito Processual do Trabalho',
  'Direito Administrativo', 'Direito Tributário', 'Direito Empresarial', 'Direito Ambiental',
  'Direito do Consumidor', 'Direitos Humanos', 'Direito Internacional', 'Direito Previdenciário',
  'Direito Financeiro', 'Filosofia do Direito', 'ECA',
]
