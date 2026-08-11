import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTrainingPrintData } from '@/server/actions/training-print'
import { PrintButton } from '@/components/admin/print-button'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Imprimir Treinamento' }

const TOPIC_TYPE_LABELS: Record<string, string> = {
  apostila: 'Conteúdo',
  flashcard: 'Flashcards',
  exercise: 'Exercícios',
  simulation: 'Simulado',
  video: 'Vídeo',
  review: 'Revisão',
}

export default async function PrintTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getTrainingPrintData(id)
  if (!data) notFound()

  const totalChapters = data.days.length
  const totalContent = data.days.reduce(
    (acc, d) => acc + d.topics.filter(t => t.apostilaContent).length,
    0
  )

  return (
    <>
      {/* ── Screen-only toolbar ─────────────────────────────────────────── */}
      <div className="print:hidden flex items-center justify-between mb-6 gap-4">
        <Link
          href={`/admin/trainings/${id}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao treinamento
        </Link>
        <PrintButton />
      </div>

      {/* ── Printable document ──────────────────────────────────────────── */}
      <style>{`
        @media print {
          aside, nav, [data-sidebar] { display: none !important; }
          body { background: white !important; }
          main { padding: 0 !important; margin: 0 !important; max-width: none !important; }
          .print\\:hidden { display: none !important; }
        }
        .apostila-body { font-family: Georgia, serif; color: #111; line-height: 1.75; font-size: 15px; }
        .apostila-body h1 { font-size: 22px; color: #1a3a5c; border-bottom: 3px solid #1a56db; padding-bottom: 10px; margin-bottom: 24px; }
        .apostila-body h2 { font-size: 17px; color: #1a3a5c; margin-top: 36px; margin-bottom: 10px; padding-left: 12px; border-left: 4px solid #1a56db; }
        .apostila-body h3 { font-size: 15px; color: #2d4a6e; margin-top: 20px; margin-bottom: 8px; }
        .apostila-body h4 { font-size: 14px; color: #2d4a6e; margin-top: 16px; margin-bottom: 6px; }
        .apostila-body p { margin: 10px 0; text-align: justify; }
        .apostila-body ul, .apostila-body ol { padding-left: 24px; margin: 10px 0; }
        .apostila-body li { margin: 5px 0; }
        .apostila-body strong { color: #1a3a5c; font-weight: 700; }
        .apostila-body em { color: #555; font-style: italic; }
        .apostila-body blockquote { border-left: 3px solid #93c5fd; padding: 10px 16px; margin: 14px 0; background: #eff6ff; color: #1e40af; border-radius: 0 6px 6px 0; }
        .apostila-body table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
        .apostila-body th { background: #1a3a5c; color: #fff; padding: 8px 12px; text-align: left; font-weight: 600; }
        .apostila-body td { padding: 7px 12px; border: 1px solid #dbeafe; }
        .apostila-body tr:nth-child(even) td { background: #f0f7ff; }
        .apostila-body hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
      `}</style>

      <div
        id="training-print"
        style={{ fontFamily: 'Georgia, serif', color: '#111', maxWidth: '800px', margin: '0 auto' }}
      >
        {/* ── Capa ────────────────────────────────────────────────────────── */}
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '60px 40px',
          borderBottom: '4px solid #1a3a5c',
          marginBottom: '48px',
        }}>
          <div style={{ fontSize: '11px', letterSpacing: '3px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '32px' }}>
            DescomplicandOAB · Plano de Treinamento
          </div>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            color: '#1a3a5c',
            lineHeight: '1.3',
            marginBottom: '20px',
            maxWidth: '600px',
          }}>
            {data.name}
          </h1>
          {data.description && (
            <p style={{ fontSize: '16px', color: '#4B5563', maxWidth: '500px', lineHeight: '1.6' }}>
              {data.description}
            </p>
          )}
          <div style={{ marginTop: '40px', display: 'flex', gap: '32px', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a56db' }}>{totalChapters}</div>
              <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px' }}>Capítulos</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a56db' }}>{totalContent}</div>
              <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px' }}>Conteúdos</div>
            </div>
          </div>
        </div>

        {/* ── Sumário ─────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '60px', pageBreakAfter: 'always' }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: '700',
            color: '#1a3a5c',
            borderBottom: '3px solid #1a56db',
            paddingBottom: '10px',
            marginBottom: '28px',
          }}>
            Sumário
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.days.map((day, idx) => {
              const contentTopics = day.topics.filter(t => t.apostilaContent)
              return (
                <div
                  key={day.id}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '8px',
                    paddingBottom: '8px',
                    borderBottom: '1px dotted #E5E7EB',
                  }}
                >
                  <span style={{
                    minWidth: '80px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#1a56db',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Cap. {idx + 1}
                  </span>
                  <span style={{ flex: 1, fontSize: '15px', color: '#1a3a5c', fontWeight: '500' }}>
                    {day.title}
                  </span>
                  {contentTopics.length > 0 && (
                    <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      {contentTopics.length} conteúdo{contentTopics.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Capítulos ────────────────────────────────────────────────────── */}
        {data.days.map((day, idx) => {
          const contentTopics = day.topics.filter(t => t.apostilaContent)
          const otherTopics = day.topics.filter(t => !t.apostilaContent)

          return (
            <div key={day.id} style={{ pageBreakBefore: idx > 0 ? 'always' : 'auto', marginBottom: '48px' }}>
              {/* Chapter header */}
              <div style={{
                backgroundColor: '#1a3a5c',
                color: '#fff',
                padding: '20px 28px',
                borderRadius: '8px',
                marginBottom: '32px',
              }}>
                <div style={{ fontSize: '11px', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>
                  Capítulo {idx + 1}
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>{day.title}</h2>
                {day.description && (
                  <p style={{ marginTop: '8px', fontSize: '14px', color: '#cbd5e1', marginBottom: 0 }}>
                    {day.description}
                  </p>
                )}
                {day.estimatedHours && day.estimatedHours > 0 && (
                  <div style={{ marginTop: '12px', fontSize: '13px', color: '#93c5fd' }}>
                    ⏱ {day.estimatedHours}h estimadas
                  </div>
                )}
              </div>

              {/* Content topics */}
              {contentTopics.map((topic, tIdx) => (
                <div key={topic.id} style={{ marginBottom: '40px' }}>
                  {contentTopics.length > 1 && (
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#1a56db',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: '8px',
                    }}>
                      Conteúdo {tIdx + 1}
                    </div>
                  )}
                  <div
                    className="apostila-body"
                    dangerouslySetInnerHTML={{ __html: topic.apostilaContent!.contentHtml }}
                  />
                  {tIdx < contentTopics.length - 1 && (
                    <hr style={{ border: 'none', borderTop: '2px dashed #E5E7EB', margin: '36px 0' }} />
                  )}
                </div>
              ))}

              {/* Other activities (no apostila) */}
              {otherTopics.length > 0 && (
                <div style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  padding: '16px 20px',
                  marginTop: contentTopics.length > 0 ? '24px' : 0,
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                    Outras atividades desta etapa
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {otherTopics.map(t => (
                      <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#374151' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '600',
                          color: '#fff',
                          backgroundColor: '#6B7280',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          flexShrink: 0,
                        }}>
                          {TOPIC_TYPE_LABELS[t.type] ?? t.type}
                        </span>
                        {t.title}
                        {t.estimatedMinutes && (
                          <span style={{ color: '#9CA3AF', fontSize: '12px' }}>({t.estimatedMinutes} min)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {contentTopics.length === 0 && otherTopics.length === 0 && (
                <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '14px' }}>
                  Nenhuma atividade cadastrada nesta etapa.
                </p>
              )}
            </div>
          )
        })}

        {/* ── Rodapé ──────────────────────────────────────────────────────── */}
        <div style={{
          marginTop: '60px',
          paddingTop: '20px',
          borderTop: '1px solid #E5E7EB',
          textAlign: 'center',
          fontSize: '12px',
          color: '#9CA3AF',
        }}>
          DescomplicandOAB · Gerado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </>
  )
}
