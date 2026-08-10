import { callClaude, callClaudeJSON, streamClaude } from './claude'

export interface ApostilaContent {
  title: string
  introduction: string
  concepts: string
  legalBasis: string
  relevantArticles: string
  jurisprudence: string
  oabTraps: string
  summary: string
  mindMap: string
  commentedQuestions: string
  htmlContent: string
}

export interface FlashcardItem {
  front: string
  back: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface GeneratedQuestion {
  statement: string
  alternatives: { a: string; b: string; c: string; d: string }
  correctAnswer: 'a' | 'b' | 'c' | 'd'
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export async function generateApostila(params: {
  subject: string
  subtheme: string
  microtheme: string
  relatedLaws?: string[]
  relatedJurisprudence?: string[]
  ragContext?: string
}): Promise<ApostilaContent> {
  const prompt = `Gere uma apostila completa para a OAB sobre:

Disciplina: ${params.subject}
Subtema: ${params.subtheme}
Microtema: ${params.microtheme}
${params.ragContext ? `\nContexto das legislações:\n${params.ragContext}` : ''}

Gere em HTML semântico bem estruturado com todas as seções.

Responda com JSON:
{
  "title": "título da apostila",
  "introduction": "<html>introdução com contexto e importância</html>",
  "concepts": "<html>conceitos fundamentais com definições</html>",
  "legalBasis": "<html>fundamentos legais com artigos e dispositivos</html>",
  "relevantArticles": "<html>artigos mais cobrados na OAB</html>",
  "jurisprudence": "<html>jurisprudência relevante com STF e STJ</html>",
  "oabTraps": "<html>pegadinhas típicas da OAB com exemplos</html>",
  "summary": "<html>resumo em bullet points</html>",
  "mindMap": "<html>mapa mental em formato de lista aninhada</html>",
  "commentedQuestions": "<html>3 questões comentadas de exames anteriores</html>",
  "htmlContent": "<html>conteúdo completo integrado</html>"
}`

  return callClaudeJSON<ApostilaContent>(prompt, SYSTEM_APOSTILA, { maxTokens: 8192 })
}

export async function* streamApostila(params: {
  subject: string
  subtheme: string
  microtheme: string
  ragContext?: string
}): AsyncGenerator<string> {
  const prompt = `Gere uma apostila completa em HTML para a OAB:
Disciplina: ${params.subject} | Subtema: ${params.subtheme} | Microtema: ${params.microtheme}
${params.ragContext ? `\nContexto: ${params.ragContext.substring(0, 2000)}` : ''}

Inclua: introdução, conceitos, fundamento legal, artigos relevantes, jurisprudência, pegadinhas da OAB, resumo, mapa mental e questões comentadas.`

  yield* streamClaude(prompt, SYSTEM_APOSTILA)
}

export async function generateFlashcards(params: {
  subject: string
  subtheme: string
  microtheme: string
  count?: number
  ragContext?: string
}): Promise<FlashcardItem[]> {
  const count = params.count || 15
  const prompt = `Gere ${count} flashcards para a OAB sobre:
Disciplina: ${params.subject} | Subtema: ${params.subtheme} | Microtema: ${params.microtheme}
${params.ragContext ? `\nContexto: ${params.ragContext.substring(0, 1500)}` : ''}

Foque em: conceitos-chave, artigos importantes, jurisprudência, pegadinhas.
Cada flashcard deve ter frente (pergunta) e verso (resposta completa).

Responda com JSON array:
[{"front": "pergunta", "back": "resposta detalhada", "difficulty": "easy|medium|hard"}]`

  return callClaudeJSON<FlashcardItem[]>(prompt, SYSTEM_FLASHCARDS, { maxTokens: 4096 })
}

export async function generateQuestions(params: {
  subject: string
  subtheme: string
  microtheme: string
  count: number
  difficulty?: 'easy' | 'medium' | 'hard'
  ragContext?: string
}): Promise<GeneratedQuestion[]> {
  const prompt = `Gere ${params.count} questões INÉDITAS no formato OAB (1ª fase) sobre:
Disciplina: ${params.subject} | Subtema: ${params.subtheme} | Microtema: ${params.microtheme}
Dificuldade: ${params.difficulty || 'medium'}
${params.ragContext ? `\nContexto: ${params.ragContext.substring(0, 1500)}` : ''}

Questões devem ser objetivas, com 4 alternativas (A, B, C, D), apenas uma correta.
Inclua análise jurídica precisa.

Responda com JSON array:
[{
  "statement": "enunciado completo",
  "alternatives": {"a": "texto A", "b": "texto B", "c": "texto C", "d": "texto D"},
  "correctAnswer": "a|b|c|d",
  "explanation": "comentário detalhado explicando a resposta correta e por que as outras estão erradas",
  "difficulty": "easy|medium|hard"
}]`

  return callClaudeJSON<GeneratedQuestion[]>(prompt, SYSTEM_QUESTIONS, { maxTokens: 6144 })
}

// Generates a single batch of up to BATCH_SIZE business days.
// Called multiple times by generateTrainingWithAI for long plans.
export async function generateTrainingPlanBatch(params: {
  name: string
  hoursPerDay: number
  batchDates: string[]        // ISO date strings for each day in this batch
  startDayNumber: number      // dayNumber of the first date in the batch
  totalBusinessDays: number
  topSubjects: Array<{ name: string; weight: number }>
  predictions: Array<{ topic: string; probability: number }>
  isFirst: boolean
}): Promise<Array<{
  dayNumber: number
  date: string
  title: string
  description: string
  estimatedHours: number
  topics: Array<{
    order: number
    title: string
    type: string
    subject: string
    subtheme: string
    microtheme: string
    estimatedMinutes: number
  }>
}>> {
  const topicsPerDay = Math.max(2, Math.min(4, Math.floor(params.hoursPerDay * 60 / 45)))
  const batchSize = params.batchDates.length
  const endDayNumber = params.startDayNumber + batchSize - 1
  const isRevisionBatch = !params.isFirst // não incluir summary/strategy em lotes subsequentes

  const prompt = `Plano OAB "${params.name}" — dias úteis ${params.startDayNumber} a ${endDayNumber} de ${params.totalBusinessDays}.
Horas/dia: ${params.hoursPerDay}h | ${topicsPerDay} tópicos/dia

Datas deste lote: ${params.batchDates.join(', ')}
Dia inicial: ${params.startDayNumber}${isRevisionBatch ? ' (continuação, sem revisar temas já cobertos nos lotes anteriores)' : ''}

Top disciplinas: ${params.topSubjects.slice(0, 6).map(s => `${s.name}(${(s.weight * 100).toFixed(0)}%)`).join(', ')}
Temas quentes: ${params.predictions.slice(0, 8).map(p => p.topic).join(', ')}

Regras: distribua por peso, progressão fácil→difícil, revisão+simulado a cada 7 dias.
Tipos: apostila, flashcard, exercise, simulation, review

Responda SOMENTE JSON (sem markdown):
[{"dayNumber":${params.startDayNumber},"date":"${params.batchDates[0]}","title":"título","description":"desc","estimatedHours":${params.hoursPerDay},"topics":[{"order":1,"title":"Título","type":"apostila","subject":"Disciplina","subtheme":"Subtema","microtheme":"Microtema","estimatedMinutes":60}]}]`

  const result = await callClaudeJSON<Array<{
    dayNumber: number
    date: string
    title: string
    description: string
    estimatedHours: number
    topics: Array<{
      order: number
      title: string
      type: string
      subject: string
      subtheme: string
      microtheme: string
      estimatedMinutes: number
    }>
  }>>(prompt, SYSTEM_TRAINING, { maxTokens: 3500 })

  return Array.isArray(result) ? result : []
}

export async function generatePredictions(params: {
  statisticsData: Array<{
    topic: string
    subject: string
    totalQuestions: number
    presenceInExams: number
    totalExams: number
    frequencyRecent: number
    trend: string
  }>
  examCount: number
}): Promise<Array<{
  rank: number
  topic: string
  subject: string
  probability: number
  frequencyHistorical: number
  frequencyRecent: number
  trend: string
  justification: string
}>> {
  const prompt = `Analise os dados históricos da OAB e gere o TOP 50 assuntos mais prováveis para a próxima prova:

Total de exames analisados: ${params.examCount}

Dados estatísticos:
${JSON.stringify(params.statisticsData.slice(0, 100), null, 2)}

Considere:
1. Frequência histórica (presença nos exames)
2. Tendência recente (crescimento/queda)
3. Ciclo de cobrança (assuntos que ficaram de fora voltam)
4. Peso da disciplina no total histórico
5. Jurisprudência e legislação nova

Responda com JSON array dos TOP 50:
[{
  "rank": 1,
  "topic": "nome do tema",
  "subject": "disciplina",
  "probability": 0.95,
  "frequencyHistorical": 0.8,
  "frequencyRecent": 0.9,
  "trend": "growing|stable|declining",
  "justification": "justificativa detalhada"
}]`

  return callClaudeJSON(prompt, SYSTEM_PREDICTIONS, { maxTokens: 8192 })
}

const SYSTEM_APOSTILA = `Você é um professor especialista em Direito com foco na OAB.
Gere apostilas completas, precisas e didáticas em HTML semântico.
Use artigos de lei reais, jurisprudência atual do STF/STJ e exemplos práticos.
Destaque as "pegadinhas" típicas da OAB. Seja abrangente mas objetivo.`

const SYSTEM_FLASHCARDS = `Você é um especialista em técnicas de memorização para concursos jurídicos.
Crie flashcards eficazes que ajudem na memorização de conceitos, artigos e jurisprudência da OAB.
Frentes devem ser perguntas objetivas. Versos devem ser respostas completas mas concisas.`

const SYSTEM_QUESTIONS = `Você é examinador da OAB com anos de experiência.
Crie questões inéditas no padrão exato da OAB: objetivas, com pegadinhas sutis, cobranças de distinções jurídicas.
Cada questão deve testar aplicação do direito, não memorização. Gabarito deve ser inequívoco.`

const SYSTEM_TRAINING = `Você é um pedagogo especializado em preparação para a OAB.
Crie planos de estudo completos baseados em dados estatísticos reais.
Distribua o conteúdo de forma eficiente, considerando revisões espaçadas e progressão de dificuldade.`

const SYSTEM_PREDICTIONS = `Você é um analista especializado em dados da OAB.
Analise padrões históricos e gere previsões fundamentadas sobre os temas mais prováveis.
Seja preciso nas probabilidades e justifique cada previsão com dados concretos.`
