import { callClaudeJSON } from './claude'
import { DISCIPLINES } from '@/types'

export interface ClassificationResult {
  discipline: string
  subtheme: string
  microtheme: string
  confidence: number
  justification: string
}

export async function classifyQuestion(
  statement: string,
  alternatives: { a: string; b: string; c: string; d: string }
): Promise<ClassificationResult> {
  const prompt = `Classifique a seguinte questão da OAB (1ª fase):

ENUNCIADO:
${statement}

ALTERNATIVAS:
A) ${alternatives.a}
B) ${alternatives.b}
C) ${alternatives.c}
D) ${alternatives.d}

Disciplinas disponíveis: ${DISCIPLINES.join(', ')}

Responda com JSON no formato:
{
  "discipline": "nome exato da disciplina",
  "subtheme": "subtema específico dentro da disciplina",
  "microtheme": "microtema detalhado",
  "confidence": 0.95,
  "justification": "breve justificativa da classificação"
}`

  return callClaudeJSON<ClassificationResult>(prompt, SYSTEM_CLASSIFY)
}

export async function classifyBatch(
  questions: Array<{
    id: string
    statement: string
    alternatives: { a: string; b: string; c: string; d: string }
  }>
): Promise<Array<{ id: string; classification: ClassificationResult }>> {
  const results: Array<{ id: string; classification: ClassificationResult }> = []

  for (const question of questions) {
    try {
      const classification = await classifyQuestion(
        question.statement,
        question.alternatives
      )
      results.push({ id: question.id, classification })
    } catch (error) {
      console.error(`Failed to classify question ${question.id}:`, error)
    }
  }

  return results
}

const SYSTEM_CLASSIFY = `Você é um especialista em Direito e na prova da OAB (Ordem dos Advogados do Brasil).
Sua tarefa é classificar questões jurídicas em disciplina, subtema e microtema.
Seja preciso e consistente na classificação.
As disciplinas são fixas. Subtemas e microtemas devem ser específicos e padronizados.`
