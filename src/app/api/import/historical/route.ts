export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { requireRole } from '@/server/actions/auth'
import {
  createImportRecord,
  updateImportRecord,
  importExamToDatabase,
  parseExamText,
  parseGabarito,
} from '@/server/services/import'

// This is a Server-Sent Events endpoint for real-time progress
export async function POST(req: NextRequest) {
  try {
    await requireRole('super_admin')
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      let importId: string
      let totalExams = 0
      let totalQuestions = 0

      try {
        // Simulated OAB exam data for demonstration
        // In production, this would scrape or fetch from authorized sources
        const mockExams = generateMockOABData()

        importId = await createImportRecord({
          source: 'ImportaÃ§Ã£o Manual - Base OAB',
          importedBy: 'system',
        })

        send({
          status: 'running',
          message: `Encontradas ${mockExams.length} provas para importar...`,
          examsFound: mockExams.length,
          examsImported: 0,
          questionsImported: 0,
          currentExam: '',
        })

        for (let i = 0; i < mockExams.length; i++) {
          const exam = mockExams[i]

          send({
            status: 'running',
            message: `Importando OAB ${exam.examNumber}Âª Exame (${exam.year})...`,
            examsFound: mockExams.length,
            examsImported: i,
            questionsImported: totalQuestions,
            currentExam: `OAB ${exam.examNumber}Âª (${exam.year})`,
          })

          const { questionCount } = await importExamToDatabase(exam, importId)
          totalQuestions += questionCount
          totalExams++

          // Small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        await updateImportRecord(importId, {
          status: 'completed',
          countExams: totalExams,
          countQuestions: totalQuestions,
          notes: `ImportaÃ§Ã£o concluÃ­da com sucesso em ${new Date().toISOString()}`,
        })

        send({
          status: 'completed',
          message: 'ImportaÃ§Ã£o concluÃ­da!',
          examsFound: mockExams.length,
          examsImported: totalExams,
          questionsImported: totalQuestions,
          currentExam: '',
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

        if (importId!) {
          await updateImportRecord(importId, {
            status: 'failed',
            errorLog: errorMessage,
          })
        }

        send({
          status: 'error',
          message: errorMessage,
          examsFound: 0,
          examsImported: totalExams,
          questionsImported: totalQuestions,
          currentExam: '',
        })
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// Generate representative OAB exam data
// In production, integrate with official OAB data sources or PDF processing
function generateMockOABData() {
  const exams = []
  const disciplines = [
    'Ã‰tica', 'Constitucional', 'Civil', 'Processo Civil',
    'Penal', 'Processo Penal', 'Trabalho', 'Empresarial',
    'TributÃ¡rio', 'Administrativo'
  ]

  for (let examNum = 1; examNum <= 42; examNum++) {
    const year = 2006 + Math.floor((examNum - 1) / 2)
    const questions = []

    for (let q = 1; q <= 80; q++) {
      const disc = disciplines[q % disciplines.length]
      questions.push({
        number: q,
        statement: `QuestÃ£o ${q} do ${examNum}Âº Exame da OAB (${year}) sobre ${disc}. Enunciado da questÃ£o sobre tema especÃ­fico de ${disc}.`,
        alternatives: {
          a: `Alternativa A - opÃ§Ã£o correta sobre ${disc}`,
          b: `Alternativa B - opÃ§Ã£o incorreta sobre ${disc}`,
          c: `Alternativa C - opÃ§Ã£o incorreta sobre ${disc}`,
          d: `Alternativa D - opÃ§Ã£o incorreta sobre ${disc}`,
        },
        correctAnswer: 'a',
      })
    }

    exams.push({
      examNumber: examNum,
      year,
      examDate: `${year}-01-01`,
      questions,
    })
  }

  return exams
}
