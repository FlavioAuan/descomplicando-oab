-- DescomplicandOAB - Initial Migration
-- Run this migration first to set up the database schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE role AS ENUM ('super_admin', 'admin', 'student');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE training_status AS ENUM ('draft', 'review', 'approved', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE simulation_type AS ENUM ('general', 'subject', 'topic', 'predicted', 'adaptive');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE topic_type AS ENUM ('apostila', 'flashcard', 'exercise', 'simulation', 'video', 'review');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE difficulty AS ENUM ('easy', 'medium', 'hard');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE trend AS ENUM ('growing', 'stable', 'declining');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE file_type AS ENUM ('pdf', 'docx', 'txt', 'epub', 'pptx');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE video_type AS ENUM ('youtube', 'upload');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE import_status AS ENUM ('pending', 'running', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── Subjects ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#2563EB',
  icon VARCHAR(50),
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS subsubjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS subsubjects_subject_idx ON subsubjects(subject_id);

CREATE TABLE IF NOT EXISTS microtopics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subsubject_id UUID NOT NULL REFERENCES subsubjects(id) ON DELETE CASCADE,
  name VARCHAR(300) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS microtopics_subsubject_idx ON microtopics(subsubject_id);

-- ─── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  avatar_url TEXT,
  role role DEFAULT 'student' NOT NULL,
  xp INTEGER DEFAULT 0 NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  streak INTEGER DEFAULT 0 NOT NULL,
  last_active_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Exams ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  exam_date DATE,
  phase VARCHAR(20) DEFAULT '1a fase',
  total_questions INTEGER DEFAULT 0,
  pdf_url TEXT,
  gabarito_url TEXT,
  imported_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(exam_number, year)
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  statement TEXT NOT NULL,
  alternatives JSONB NOT NULL,
  correct_answer VARCHAR(1) NOT NULL,
  subject_id UUID REFERENCES subjects(id),
  subsubject_id UUID REFERENCES subsubjects(id),
  microtopic_id UUID REFERENCES microtopics(id),
  difficulty difficulty DEFAULT 'medium',
  classified BOOLEAN DEFAULT false,
  classified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS exam_questions_exam_idx ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS exam_questions_subject_idx ON exam_questions(subject_id);

-- ─── Statistics ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id),
  subsubject_id UUID REFERENCES subsubjects(id),
  microtopic_id UUID REFERENCES microtopics(id),
  total_questions INTEGER DEFAULT 0 NOT NULL,
  percentage_historical REAL DEFAULT 0,
  avg_per_exam REAL DEFAULT 0,
  trend trend DEFAULT 'stable',
  presence_in_exams INTEGER DEFAULT 0,
  total_exams INTEGER DEFAULT 0,
  last_calculated TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id),
  subsubject_id UUID REFERENCES subsubjects(id),
  microtopic_id UUID REFERENCES microtopics(id),
  rank INTEGER NOT NULL,
  probability REAL NOT NULL,
  frequency_historical REAL DEFAULT 0,
  frequency_recent REAL DEFAULT 0,
  trend trend DEFAULT 'stable',
  justification TEXT,
  generated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  generated_for_exam INTEGER
);

-- ─── Knowledge Base ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS knowledge_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(300) NOT NULL,
  original_name VARCHAR(300) NOT NULL,
  file_type file_type NOT NULL,
  url TEXT NOT NULL,
  size_bytes INTEGER,
  subject_id UUID REFERENCES subjects(id),
  version INTEGER DEFAULT 1 NOT NULL,
  previous_version_id UUID,
  is_active BOOLEAN DEFAULT true NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS knowledge_files_subject_idx ON knowledge_files(subject_id);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES knowledge_files(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  subject_id UUID REFERENCES subjects(id),
  subsubject_id UUID REFERENCES subsubjects(id),
  microtopic_id UUID REFERENCES microtopics(id),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_file_idx ON knowledge_chunks(file_id);
CREATE INDEX IF NOT EXISTS knowledge_chunks_subject_idx ON knowledge_chunks(subject_id);

-- Full-text search index for knowledge chunks
CREATE INDEX IF NOT EXISTS knowledge_chunks_fts_idx
  ON knowledge_chunks USING GIN(to_tsvector('portuguese', content));

-- ─── Videos ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(300) NOT NULL,
  url TEXT NOT NULL,
  video_type video_type NOT NULL,
  subject_id UUID REFERENCES subjects(id),
  subsubject_id UUID REFERENCES subsubjects(id),
  microtopic_id UUID REFERENCES microtopics(id),
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Trainings ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(300) NOT NULL,
  description TEXT,
  hours_per_day REAL NOT NULL,
  days_count INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status training_status DEFAULT 'draft' NOT NULL,
  target_exam INTEGER,
  current_version INTEGER DEFAULT 1 NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS training_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  changes_description TEXT,
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS training_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  estimated_hours REAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS training_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_day_id UUID NOT NULL REFERENCES training_days(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL,
  title VARCHAR(300) NOT NULL,
  type topic_type NOT NULL,
  subject_id UUID REFERENCES subjects(id),
  subsubject_id UUID REFERENCES subsubjects(id),
  microtopic_id UUID REFERENCES microtopics(id),
  content JSONB,
  estimated_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Apostilas ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS apostilas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_topic_id UUID REFERENCES training_topics(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id),
  subsubject_id UUID REFERENCES subsubjects(id),
  microtopic_id UUID REFERENCES microtopics(id),
  title VARCHAR(300) NOT NULL,
  content_html TEXT NOT NULL,
  pdf_url TEXT,
  generated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  generated_by VARCHAR(50) DEFAULT 'claude',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ─── Flashcards ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  subject_id UUID REFERENCES subjects(id),
  subsubject_id UUID REFERENCES subsubjects(id),
  microtopic_id UUID REFERENCES microtopics(id),
  training_id UUID REFERENCES trainings(id),
  difficulty difficulty DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS student_flashcard_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  attempts INTEGER DEFAULT 0 NOT NULL,
  correct INTEGER DEFAULT 0 NOT NULL,
  last_reviewed TIMESTAMP,
  next_review TIMESTAMP,
  ease_factor REAL DEFAULT 2.5,
  interval INTEGER DEFAULT 1,
  UNIQUE(user_id, flashcard_id)
);

CREATE INDEX IF NOT EXISTS sfp_next_review_idx ON student_flashcard_progress(next_review);

-- ─── Simulations ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(300) NOT NULL,
  type simulation_type NOT NULL,
  subject_id UUID REFERENCES subjects(id),
  total_questions INTEGER DEFAULT 40 NOT NULL,
  time_limit_minutes INTEGER DEFAULT 300,
  training_id UUID REFERENCES trainings(id),
  is_adaptive BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS simulation_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id),
  "order" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS student_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  simulation_id UUID NOT NULL REFERENCES simulations(id),
  started_at TIMESTAMP DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP,
  total_answered INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  score REAL DEFAULT 0,
  percentage REAL DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS student_sims_user_idx ON student_simulations(user_id);

CREATE TABLE IF NOT EXISTS student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id),
  student_simulation_id UUID REFERENCES student_simulations(id),
  answer VARCHAR(1) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_spent_seconds INTEGER DEFAULT 0,
  answered_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS student_answers_user_idx ON student_answers(user_id);
CREATE INDEX IF NOT EXISTS student_answers_question_idx ON student_answers(question_id);

-- ─── Error Notebook ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS error_notebook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id),
  error_answer VARCHAR(1) NOT NULL,
  correct_answer VARCHAR(1) NOT NULL,
  review_count INTEGER DEFAULT 0 NOT NULL,
  next_review_at TIMESTAMP,
  last_reviewed_at TIMESTAMP,
  mastered BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS error_notebook_user_idx ON error_notebook(user_id);
CREATE INDEX IF NOT EXISTS error_notebook_review_idx ON error_notebook(next_review_at);

-- ─── Student Training Progress ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS student_training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES trainings(id),
  current_day INTEGER DEFAULT 1 NOT NULL,
  completed_topics JSONB DEFAULT '[]',
  started_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP,
  completed_at TIMESTAMP,
  xp_earned INTEGER DEFAULT 0,
  UNIQUE(user_id, training_id)
);

-- ─── Certificates ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES trainings(id),
  hours_completed REAL NOT NULL,
  average_score REAL NOT NULL,
  issued_at TIMESTAMP DEFAULT NOW() NOT NULL,
  pdf_url TEXT,
  code VARCHAR(50) UNIQUE
);

CREATE INDEX IF NOT EXISTS certificates_user_idx ON certificates(user_id);

-- ─── Gamification ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(100),
  xp_reward INTEGER DEFAULT 100 NOT NULL,
  condition JSONB NOT NULL,
  rarity VARCHAR(20) DEFAULT 'common',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id),
  earned_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, achievement_id)
);

-- ─── AI Generations ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  entity_id UUID,
  entity_type VARCHAR(50),
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  model VARCHAR(100),
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_gen_type_idx ON ai_generations(type);

-- ─── Import History ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(300) NOT NULL,
  status import_status DEFAULT 'pending' NOT NULL,
  count_exams INTEGER DEFAULT 0,
  count_questions INTEGER DEFAULT 0,
  imported_by UUID REFERENCES users(id),
  started_at TIMESTAMP DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP,
  notes TEXT,
  error_log TEXT
);

-- ─── Seed: Default Disciplines ─────────────────────────────────────────────────

INSERT INTO subjects (name, color, "order") VALUES
  ('Ética', '#6366F1', 1),
  ('Constitucional', '#2563EB', 2),
  ('Administrativo', '#0891B2', 3),
  ('Civil', '#059669', 4),
  ('Processo Civil', '#10B981', 5),
  ('Penal', '#DC2626', 6),
  ('Processo Penal', '#EF4444', 7),
  ('Trabalho', '#D97706', 8),
  ('Processo do Trabalho', '#F59E0B', 9),
  ('Empresarial', '#7C3AED', 10),
  ('Tributário', '#9333EA', 11),
  ('Ambiental', '#16A34A', 12),
  ('Consumidor', '#EA580C', 13),
  ('Direitos Humanos', '#BE185D', 14),
  ('Internacional', '#0369A1', 15),
  ('Previdenciário', '#64748B', 16),
  ('Financeiro', '#475569', 17),
  ('Filosofia do Direito', '#334155', 18),
  ('ECA', '#1E40AF', 19)
ON CONFLICT (name) DO NOTHING;

-- ─── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_notebook ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_flashcard_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can see their own data
CREATE POLICY "users_own_data" ON users
  FOR ALL USING (auth.uid()::text = auth_id::text);

-- Students can see/modify their own answers
CREATE POLICY "student_own_answers" ON student_answers
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "student_own_simulations" ON student_simulations
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "student_own_errors" ON error_notebook
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "student_own_flashcards" ON student_flashcard_progress
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "student_own_progress" ON student_training_progress
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Public read access for approved content
CREATE POLICY "public_read_subjects" ON subjects
  FOR SELECT USING (true);

CREATE POLICY "public_read_exams" ON exams
  FOR SELECT USING (true);

CREATE POLICY "public_read_questions" ON exam_questions
  FOR SELECT USING (true);

CREATE POLICY "public_read_approved_trainings" ON trainings
  FOR SELECT USING (status = 'approved');

CREATE POLICY "public_read_flashcards" ON flashcards
  FOR SELECT USING (true);

CREATE POLICY "public_read_simulations" ON simulations
  FOR SELECT USING (true);
