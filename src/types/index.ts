export const DISCIPLINES = [
  'Ética',
  'Constitucional',
  'Administrativo',
  'Civil',
  'Processo Civil',
  'Penal',
  'Processo Penal',
  'Trabalho',
  'Processo do Trabalho',
  'Empresarial',
  'Tributário',
  'Ambiental',
  'Consumidor',
  'Direitos Humanos',
  'Internacional',
  'Previdenciário',
  'Financeiro',
  'Filosofia do Direito',
  'ECA',
] as const

export type Discipline = (typeof DISCIPLINES)[number]

export type Role = 'super_admin' | 'admin' | 'student'

export type TrainingStatus = 'draft' | 'review' | 'approved' | 'archived'

export type SimulationType = 'general' | 'subject' | 'topic' | 'predicted' | 'adaptive'

export type TopicType = 'apostila' | 'flashcard' | 'exercise' | 'simulation' | 'video' | 'review'

export type Difficulty = 'easy' | 'medium' | 'hard'

export type Trend = 'growing' | 'stable' | 'declining'

export interface User {
  id: string
  authId: string
  email: string
  name: string
  avatarUrl?: string | null
  role: Role
  xp: number
  level: number
  streak: number
  lastActiveAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Subject {
  id: string
  name: string
  description?: string | null
  color?: string | null
  icon?: string | null
  order: number
}

export interface Subsubject {
  id: string
  subjectId: string
  name: string
  description?: string | null
}

export interface Microtopic {
  id: string
  subsubjectId: string
  name: string
  description?: string | null
}

export interface Exam {
  id: string
  examNumber: number
  year: number
  examDate?: string | null
  phase: string
  totalQuestions: number
  pdfUrl?: string | null
  gabaritoUrl?: string | null
  importedAt?: Date | null
  createdAt: Date
}

export interface ExamQuestion {
  id: string
  examId: string
  number: number
  statement: string
  alternatives: { a: string; b: string; c: string; d: string }
  correctAnswer: string
  subjectId?: string | null
  subsubjectId?: string | null
  microtopicId?: string | null
  difficulty?: Difficulty | null
  classified: boolean
}

export interface Training {
  id: string
  name: string
  description?: string | null
  hoursPerDay: number
  daysCount: number
  startDate: string
  endDate: string
  status: TrainingStatus
  targetExam?: number | null
  currentVersion: number
  createdBy: string
  approvedBy?: string | null
  approvedAt?: Date | null
  publishedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Flashcard {
  id: string
  front: string
  back: string
  subjectId?: string | null
  subsubjectId?: string | null
  microtopicId?: string | null
  trainingId?: string | null
  difficulty?: Difficulty | null
  createdAt: Date
}

export interface Simulation {
  id: string
  name: string
  type: SimulationType
  subjectId?: string | null
  totalQuestions: number
  timeLimitMinutes?: number | null
  trainingId?: string | null
  isAdaptive: boolean | null
  createdBy?: string | null
  createdAt: Date
}

export interface StudentSimulation {
  id: string
  userId: string
  simulationId: string
  startedAt: Date
  completedAt?: Date | null
  totalAnswered: number | null
  totalCorrect: number | null
  score: number | null
  percentage: number | null
  timeSpentSeconds: number | null
}

export interface ErrorNotebookEntry {
  id: string
  userId: string
  questionId: string
  errorAnswer: string
  correctAnswer: string
  reviewCount: number
  nextReviewAt?: Date | null
  mastered: boolean
  createdAt: Date
}

export interface Certificate {
  id: string
  userId: string
  trainingId: string
  hoursCompleted: number
  averageScore: number
  issuedAt: Date
  pdfUrl?: string | null
  code?: string | null
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon?: string | null
  xpReward: number
  condition: { type: string; value: number; subjectId?: string }
  rarity: string
}

export interface StatisticsData {
  subjectId?: string | null
  subsubjectId?: string | null
  microtopicId?: string | null
  totalQuestions: number
  percentageHistorical?: number | null
  avgPerExam?: number | null
  trend?: Trend | null
  presenceInExams: number
  totalExams: number
  lastCalculated?: Date | null
}

export interface PredictionItem {
  rank: number
  subjectId?: string | null
  subsubjectId?: string | null
  microtopicId?: string | null
  probability: number
  frequencyHistorical?: number | null
  frequencyRecent?: number | null
  trend?: Trend | null
  justification?: string | null
  generatedAt: Date
}

export interface DashboardStats {
  totalExams: number
  totalQuestions: number
  totalStudents: number
  classifiedQuestions: number
  classificationRate: number
  topSubjects: Array<{
    name: string
    count: number
    percentage: number
    trend: Trend
  }>
}

export interface StudentDashboard {
  user: User
  trainingProgress: number
  todayTopics: number
  totalCorrect: number
  totalAnswered: number
  accuracy: number
  streak: number
  nextReviews: number
  recentSimulations: StudentSimulation[]
  weakSubjects: Array<{ name: string; accuracy: number }>
  estimatedApproval: number
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Form types
export interface CreateTrainingInput {
  name: string
  description?: string
  hoursPerDay: number
  daysCount: number
  startDate: string
  endDate: string
  targetExam?: number
}

export interface UploadKnowledgeInput {
  file: File
  subjectId?: string
  name: string
}

export interface CreateSimulationInput {
  name: string
  type: SimulationType
  subjectId?: string
  totalQuestions: number
  timeLimitMinutes?: number
  trainingId?: string
}
