import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  boolean,
  real,
  jsonb,
  pgEnum,
  serial,
  varchar,
  date,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum('role', ['super_admin', 'admin', 'student'])
export const trainingStatusEnum = pgEnum('training_status', [
  'draft',
  'review',
  'approved',
  'archived',
])
export const simulationTypeEnum = pgEnum('simulation_type', [
  'general',
  'subject',
  'topic',
  'predicted',
  'adaptive',
])
export const topicTypeEnum = pgEnum('topic_type', [
  'apostila',
  'flashcard',
  'exercise',
  'simulation',
  'video',
  'review',
])
export const difficultyEnum = pgEnum('difficulty', ['easy', 'medium', 'hard'])
export const trendEnum = pgEnum('trend', ['growing', 'stable', 'declining'])
export const fileTypeEnum = pgEnum('file_type', ['pdf', 'docx', 'txt', 'epub', 'pptx'])
export const videoTypeEnum = pgEnum('video_type', ['youtube', 'upload'])
export const importStatusEnum = pgEnum('import_status', ['pending', 'running', 'completed', 'failed'])

// ─── Subjects (Disciplinas) ────────────────────────────────────────────────────

export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  color: varchar('color', { length: 7 }).default('#2563EB'),
  icon: varchar('icon', { length: 50 }),
  order: integer('order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const subsubjects = pgTable('subsubjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [index('subsubjects_subject_idx').on(t.subjectId)])

export const microtopics = pgTable('microtopics', {
  id: uuid('id').primaryKey().defaultRandom(),
  subsubjectId: uuid('subsubject_id').notNull().references(() => subsubjects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 300 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [index('microtopics_subsubject_idx').on(t.subsubjectId)])

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  authId: uuid('auth_id').notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  avatarUrl: text('avatar_url'),
  role: roleEnum('role').default('student').notNull(),
  xp: integer('xp').default(0).notNull(),
  level: integer('level').default(1).notNull(),
  streak: integer('streak').default(0).notNull(),
  lastActiveAt: timestamp('last_active_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Exams ────────────────────────────────────────────────────────────────────

export const exams = pgTable('exams', {
  id: uuid('id').primaryKey().defaultRandom(),
  examNumber: integer('exam_number').notNull(),
  year: integer('year').notNull(),
  examDate: date('exam_date'),
  phase: varchar('phase', { length: 20 }).default('1a fase'),
  totalQuestions: integer('total_questions').default(0),
  pdfUrl: text('pdf_url'),
  gabaritoUrl: text('gabarito_url'),
  importedAt: timestamp('imported_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [uniqueIndex('exams_number_year_idx').on(t.examNumber, t.year)])

export const examQuestions = pgTable('exam_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  examId: uuid('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  statement: text('statement').notNull(),
  alternatives: jsonb('alternatives').notNull().$type<{
    a: string; b: string; c: string; d: string
  }>(),
  correctAnswer: varchar('correct_answer', { length: 1 }).notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id),
  subsubjectId: uuid('subsubject_id').references(() => subsubjects.id),
  microtopicId: uuid('microtopic_id').references(() => microtopics.id),
  difficulty: difficultyEnum('difficulty').default('medium'),
  classified: boolean('classified').default(false),
  classifiedAt: timestamp('classified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('exam_questions_exam_idx').on(t.examId),
  index('exam_questions_subject_idx').on(t.subjectId),
])

// ─── Statistics ───────────────────────────────────────────────────────────────

export const statistics = pgTable('statistics', {
  id: uuid('id').primaryKey().defaultRandom(),
  subjectId: uuid('subject_id').references(() => subjects.id),
  subsubjectId: uuid('subsubject_id').references(() => subsubjects.id),
  microtopicId: uuid('microtopic_id').references(() => microtopics.id),
  totalQuestions: integer('total_questions').default(0).notNull(),
  percentageHistorical: real('percentage_historical').default(0),
  avgPerExam: real('avg_per_exam').default(0),
  trend: trendEnum('trend').default('stable'),
  presenceInExams: integer('presence_in_exams').default(0),
  totalExams: integer('total_exams').default(0),
  lastCalculated: timestamp('last_calculated').defaultNow(),
})

export const predictions = pgTable('predictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  subjectId: uuid('subject_id').references(() => subjects.id),
  subsubjectId: uuid('subsubject_id').references(() => subsubjects.id),
  microtopicId: uuid('microtopic_id').references(() => microtopics.id),
  rank: integer('rank').notNull(),
  probability: real('probability').notNull(),
  frequencyHistorical: real('frequency_historical').default(0),
  frequencyRecent: real('frequency_recent').default(0),
  trend: trendEnum('trend').default('stable'),
  justification: text('justification'),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  generatedForExam: integer('generated_for_exam'),
})

// ─── Knowledge Base (RAG) ─────────────────────────────────────────────────────

export const knowledgeFiles = pgTable('knowledge_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 300 }).notNull(),
  originalName: varchar('original_name', { length: 300 }).notNull(),
  fileType: fileTypeEnum('file_type').notNull(),
  url: text('url').notNull(),
  sizeBytes: integer('size_bytes'),
  subjectId: uuid('subject_id').references(() => subjects.id),
  version: integer('version').default(1).notNull(),
  previousVersionId: uuid('previous_version_id'),
  isActive: boolean('is_active').default(true).notNull(),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [index('knowledge_files_subject_idx').on(t.subjectId)])

export const knowledgeChunks = pgTable('knowledge_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').notNull().references(() => knowledgeFiles.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id),
  subsubjectId: uuid('subsubject_id').references(() => subsubjects.id),
  microtopicId: uuid('microtopic_id').references(() => microtopics.id),
  metadata: jsonb('metadata').$type<{
    page?: number
    section?: string
    articleRef?: string
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('knowledge_chunks_file_idx').on(t.fileId),
  index('knowledge_chunks_subject_idx').on(t.subjectId),
])

// ─── Videos ───────────────────────────────────────────────────────────────────

export const videos = pgTable('videos', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 300 }).notNull(),
  url: text('url').notNull(),
  videoType: videoTypeEnum('video_type').notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id),
  subsubjectId: uuid('subsubject_id').references(() => subsubjects.id),
  microtopicId: uuid('microtopic_id').references(() => microtopics.id),
  durationSeconds: integer('duration_seconds'),
  thumbnailUrl: text('thumbnail_url'),
  description: text('description'),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [index('videos_subject_idx').on(t.subjectId)])

// ─── Trainings ────────────────────────────────────────────────────────────────

export const trainings = pgTable('trainings', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 300 }).notNull(),
  description: text('description'),
  hoursPerDay: real('hours_per_day').notNull(),
  daysCount: integer('days_count').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: trainingStatusEnum('status').default('draft').notNull(),
  targetExam: integer('target_exam'),
  currentVersion: integer('current_version').default(1).notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [index('trainings_status_idx').on(t.status)])

export const trainingVersions = pgTable('training_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  trainingId: uuid('training_id').notNull().references(() => trainings.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  snapshot: jsonb('snapshot').notNull(),
  changesDescription: text('changes_description'),
  changedBy: uuid('changed_by').notNull().references(() => users.id),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
}, (t) => [index('training_versions_training_idx').on(t.trainingId)])

export const trainingDays = pgTable('training_days', {
  id: uuid('id').primaryKey().defaultRandom(),
  trainingId: uuid('training_id').notNull().references(() => trainings.id, { onDelete: 'cascade' }),
  dayNumber: integer('day_number').notNull(),
  date: date('date'),
  title: varchar('title', { length: 300 }).notNull(),
  description: text('description'),
  estimatedHours: real('estimated_hours').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [index('training_days_training_idx').on(t.trainingId)])

export const trainingTopics = pgTable('training_topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  trainingDayId: uuid('training_day_id').notNull().references(() => trainingDays.id, { onDelete: 'cascade' }),
  order: integer('order').notNull(),
  title: varchar('title', { length: 300 }).notNull(),
  type: topicTypeEnum('type').notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id),
  subsubjectId: uuid('subsubject_id').references(() => subsubjects.id),
  microtopicId: uuid('microtopic_id').references(() => microtopics.id),
  content: jsonb('content'),
  estimatedMinutes: integer('estimated_minutes').default(30),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [index('training_topics_day_idx').on(t.trainingDayId)])

// ─── Apostilas ────────────────────────────────────────────────────────────────

export const apostilas = pgTable('apostilas', {
  id: uuid('id').primaryKey().defaultRandom(),
  trainingTopicId: uuid('training_topic_id').references(() => trainingTopics.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').references(() => subjects.id),
  subsubjectId: uuid('subsubject_id').references(() => subsubjects.id),
  microtopicId: uuid('microtopic_id').references(() => microtopics.id),
  title: varchar('title', { length: 300 }).notNull(),
  contentHtml: text('content_html').notNull(),
  pdfUrl: text('pdf_url'),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  generatedBy: varchar('generated_by', { length: 50 }).default('claude'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [index('apostilas_subject_idx').on(t.subjectId)])

// ─── Flashcards ────────────────────────────────────────────────────────────────

export const flashcards = pgTable('flashcards', {
  id: uuid('id').primaryKey().defaultRandom(),
  front: text('front').notNull(),
  back: text('back').notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id),
  subsubjectId: uuid('subsubject_id').references(() => subsubjects.id),
  microtopicId: uuid('microtopic_id').references(() => microtopics.id),
  trainingId: uuid('training_id').references(() => trainings.id),
  difficulty: difficultyEnum('difficulty').default('medium'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [index('flashcards_subject_idx').on(t.subjectId)])

export const studentFlashcardProgress = pgTable('student_flashcard_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  flashcardId: uuid('flashcard_id').notNull().references(() => flashcards.id, { onDelete: 'cascade' }),
  attempts: integer('attempts').default(0).notNull(),
  correct: integer('correct').default(0).notNull(),
  lastReviewed: timestamp('last_reviewed'),
  nextReview: timestamp('next_review'),
  easeFactor: real('ease_factor').default(2.5),
  interval: integer('interval').default(1),
}, (t) => [
  uniqueIndex('sfp_user_flashcard_idx').on(t.userId, t.flashcardId),
  index('sfp_next_review_idx').on(t.nextReview),
])

// ─── Simulations ──────────────────────────────────────────────────────────────

export const simulations = pgTable('simulations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 300 }).notNull(),
  type: simulationTypeEnum('type').notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id),
  totalQuestions: integer('total_questions').default(40).notNull(),
  timeLimitMinutes: integer('time_limit_minutes').default(300),
  trainingId: uuid('training_id').references(() => trainings.id),
  isAdaptive: boolean('is_adaptive').default(false),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const simulationQuestions = pgTable('simulation_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  simulationId: uuid('simulation_id').notNull().references(() => simulations.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => examQuestions.id),
  order: integer('order').notNull(),
}, (t) => [index('sim_questions_sim_idx').on(t.simulationId)])

export const studentSimulations = pgTable('student_simulations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  simulationId: uuid('simulation_id').notNull().references(() => simulations.id),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  totalAnswered: integer('total_answered').default(0),
  totalCorrect: integer('total_correct').default(0),
  score: real('score').default(0),
  percentage: real('percentage').default(0),
  timeSpentSeconds: integer('time_spent_seconds').default(0),
}, (t) => [index('student_sims_user_idx').on(t.userId)])

export const studentAnswers = pgTable('student_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => examQuestions.id),
  studentSimulationId: uuid('student_simulation_id').references(() => studentSimulations.id),
  answer: varchar('answer', { length: 1 }).notNull(),
  isCorrect: boolean('is_correct').notNull(),
  timeSpentSeconds: integer('time_spent_seconds').default(0),
  answeredAt: timestamp('answered_at').defaultNow().notNull(),
}, (t) => [
  index('student_answers_user_idx').on(t.userId),
  index('student_answers_question_idx').on(t.questionId),
])

// ─── Error Notebook ────────────────────────────────────────────────────────────

export const errorNotebook = pgTable('error_notebook', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => examQuestions.id),
  errorAnswer: varchar('error_answer', { length: 1 }).notNull(),
  correctAnswer: varchar('correct_answer', { length: 1 }).notNull(),
  reviewCount: integer('review_count').default(0).notNull(),
  nextReviewAt: timestamp('next_review_at'),
  lastReviewedAt: timestamp('last_reviewed_at'),
  mastered: boolean('mastered').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('error_notebook_user_idx').on(t.userId),
  index('error_notebook_review_idx').on(t.nextReviewAt),
])

// ─── Student Training Progress ─────────────────────────────────────────────────

export const studentTrainingProgress = pgTable('student_training_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  trainingId: uuid('training_id').notNull().references(() => trainings.id),
  currentDay: integer('current_day').default(1).notNull(),
  completedTopics: jsonb('completed_topics').$type<string[]>().default([]),
  startedAt: timestamp('started_at').defaultNow(),
  lastAccessedAt: timestamp('last_accessed_at'),
  completedAt: timestamp('completed_at'),
  xpEarned: integer('xp_earned').default(0),
}, (t) => [uniqueIndex('stp_user_training_idx').on(t.userId, t.trainingId)])

// ─── Certificates ─────────────────────────────────────────────────────────────

export const certificates = pgTable('certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  trainingId: uuid('training_id').notNull().references(() => trainings.id),
  hoursCompleted: real('hours_completed').notNull(),
  averageScore: real('average_score').notNull(),
  issuedAt: timestamp('issued_at').defaultNow().notNull(),
  pdfUrl: text('pdf_url'),
  code: varchar('code', { length: 50 }).unique(),
}, (t) => [index('certificates_user_idx').on(t.userId)])

// ─── Gamification ─────────────────────────────────────────────────────────────

export const achievements = pgTable('achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description').notNull(),
  icon: varchar('icon', { length: 100 }),
  xpReward: integer('xp_reward').default(100).notNull(),
  condition: jsonb('condition').notNull().$type<{
    type: string
    value: number
    subjectId?: string
  }>(),
  rarity: varchar('rarity', { length: 20 }).default('common'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const userAchievements = pgTable('user_achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  achievementId: uuid('achievement_id').notNull().references(() => achievements.id),
  earnedAt: timestamp('earned_at').defaultNow().notNull(),
}, (t) => [uniqueIndex('ua_user_achievement_idx').on(t.userId, t.achievementId)])

// ─── AI Generations ───────────────────────────────────────────────────────────

export const aiGenerations = pgTable('ai_generations', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 50 }).notNull(),
  entityId: uuid('entity_id'),
  entityType: varchar('entity_type', { length: 50 }),
  inputTokens: integer('input_tokens').default(0),
  outputTokens: integer('output_tokens').default(0),
  model: varchar('model', { length: 100 }),
  durationMs: integer('duration_ms'),
  success: boolean('success').default(true),
  error: text('error'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [index('ai_gen_type_idx').on(t.type)])

// ─── Import History ───────────────────────────────────────────────────────────

export const importHistory = pgTable('import_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: varchar('source', { length: 300 }).notNull(),
  status: importStatusEnum('status').default('pending').notNull(),
  countExams: integer('count_exams').default(0),
  countQuestions: integer('count_questions').default(0),
  importedBy: uuid('imported_by').references(() => users.id),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
  errorLog: text('error_log'),
})

// ─── System Settings ──────────────────────────────────────────────────────────

export const systemSettings = pgTable('system_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const subjectsRelations = relations(subjects, ({ many }) => ({
  subsubjects: many(subsubjects),
  questions: many(examQuestions),
  statistics: many(statistics),
}))

export const subsubjectsRelations = relations(subsubjects, ({ one, many }) => ({
  subject: one(subjects, { fields: [subsubjects.subjectId], references: [subjects.id] }),
  microtopics: many(microtopics),
}))

export const microtopicsRelations = relations(microtopics, ({ one }) => ({
  subsubject: one(subsubjects, { fields: [microtopics.subsubjectId], references: [subsubjects.id] }),
}))

export const examsRelations = relations(exams, ({ many }) => ({
  questions: many(examQuestions),
}))

export const examQuestionsRelations = relations(examQuestions, ({ one, many }) => ({
  exam: one(exams, { fields: [examQuestions.examId], references: [exams.id] }),
  subject: one(subjects, { fields: [examQuestions.subjectId], references: [subjects.id] }),
  subsubject: one(subsubjects, { fields: [examQuestions.subsubjectId], references: [subsubjects.id] }),
  microtopic: one(microtopics, { fields: [examQuestions.microtopicId], references: [microtopics.id] }),
  studentAnswers: many(studentAnswers),
}))

export const trainingsRelations = relations(trainings, ({ one, many }) => ({
  creator: one(users, { fields: [trainings.createdBy], references: [users.id] }),
  approver: one(users, { fields: [trainings.approvedBy], references: [users.id] }),
  days: many(trainingDays),
  versions: many(trainingVersions),
  flashcards: many(flashcards),
  simulations: many(simulations),
}))

export const trainingDaysRelations = relations(trainingDays, ({ one, many }) => ({
  training: one(trainings, { fields: [trainingDays.trainingId], references: [trainings.id] }),
  topics: many(trainingTopics),
}))

export const usersRelations = relations(users, ({ many }) => ({
  answers: many(studentAnswers),
  errors: many(errorNotebook),
  trainingProgress: many(studentTrainingProgress),
  simulations: many(studentSimulations),
  achievements: many(userAchievements),
  certificates: many(certificates),
}))
