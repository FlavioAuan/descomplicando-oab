-- Flashcard Sets (admin-created groups of flashcards)
CREATE TABLE IF NOT EXISTS "flashcard_sets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(300) NOT NULL,
  "apostila_id" uuid REFERENCES "apostilas"("id") ON DELETE SET NULL,
  "subject_id" uuid REFERENCES "subjects"("id"),
  "card_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "flashcard_set_cards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "set_id" uuid NOT NULL REFERENCES "flashcard_sets"("id") ON DELETE CASCADE,
  "order" integer NOT NULL,
  "front" text NOT NULL,
  "back" text NOT NULL,
  "difficulty" "difficulty" DEFAULT 'medium'
);
CREATE INDEX IF NOT EXISTS "fsc_set_idx" ON "flashcard_set_cards" ("set_id");

-- Exercise Sets (AI-generated from apostilas)
CREATE TABLE IF NOT EXISTS "exercise_sets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(300) NOT NULL,
  "apostila_id" uuid REFERENCES "apostilas"("id") ON DELETE SET NULL,
  "subject_id" uuid REFERENCES "subjects"("id"),
  "question_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "exercise_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "set_id" uuid NOT NULL REFERENCES "exercise_sets"("id") ON DELETE CASCADE,
  "order" integer NOT NULL,
  "statement" text NOT NULL,
  "alternatives" jsonb NOT NULL,
  "correct_answer" varchar(1) NOT NULL,
  "explanation" text
);
CREATE INDEX IF NOT EXISTS "eq_set_idx" ON "exercise_questions" ("set_id");

-- Student Exercise Progress
CREATE TABLE IF NOT EXISTS "student_exercise_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "set_id" uuid NOT NULL REFERENCES "exercise_sets"("id") ON DELETE CASCADE,
  "answers" jsonb DEFAULT '{}' NOT NULL,
  "total_correct" integer DEFAULT 0,
  "total_questions" integer DEFAULT 0,
  "completed_at" timestamp,
  "started_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "sep_user_set_idx" ON "student_exercise_progress" ("user_id", "set_id");
