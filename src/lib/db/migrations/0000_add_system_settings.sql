CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."file_type" AS ENUM('pdf', 'docx', 'txt', 'epub', 'pptx');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('super_admin', 'admin', 'student');--> statement-breakpoint
CREATE TYPE "public"."simulation_type" AS ENUM('general', 'subject', 'topic', 'predicted', 'adaptive');--> statement-breakpoint
CREATE TYPE "public"."topic_type" AS ENUM('apostila', 'flashcard', 'exercise', 'simulation', 'video', 'review');--> statement-breakpoint
CREATE TYPE "public"."training_status" AS ENUM('draft', 'review', 'approved', 'archived');--> statement-breakpoint
CREATE TYPE "public"."trend" AS ENUM('growing', 'stable', 'declining');--> statement-breakpoint
CREATE TYPE "public"."video_type" AS ENUM('youtube', 'upload');--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"icon" varchar(100),
	"xp_reward" integer DEFAULT 100 NOT NULL,
	"condition" jsonb NOT NULL,
	"rarity" varchar(20) DEFAULT 'common',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"entity_type" varchar(50),
	"input_tokens" integer DEFAULT 0,
	"output_tokens" integer DEFAULT 0,
	"model" varchar(100),
	"duration_ms" integer,
	"success" boolean DEFAULT true,
	"error" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apostilas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_topic_id" uuid,
	"subject_id" uuid,
	"subsubject_id" uuid,
	"microtopic_id" uuid,
	"title" varchar(300) NOT NULL,
	"content_html" text NOT NULL,
	"pdf_url" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"generated_by" varchar(50) DEFAULT 'claude',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"training_id" uuid NOT NULL,
	"hours_completed" real NOT NULL,
	"average_score" real NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"pdf_url" text,
	"code" varchar(50),
	CONSTRAINT "certificates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "error_notebook" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"error_answer" varchar(1) NOT NULL,
	"correct_answer" varchar(1) NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"next_review_at" timestamp,
	"last_reviewed_at" timestamp,
	"mastered" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"statement" text NOT NULL,
	"alternatives" jsonb NOT NULL,
	"correct_answer" varchar(1) NOT NULL,
	"subject_id" uuid,
	"subsubject_id" uuid,
	"microtopic_id" uuid,
	"difficulty" "difficulty" DEFAULT 'medium',
	"classified" boolean DEFAULT false,
	"classified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_number" integer NOT NULL,
	"year" integer NOT NULL,
	"exam_date" date,
	"phase" varchar(20) DEFAULT '1a fase',
	"total_questions" integer DEFAULT 0,
	"pdf_url" text,
	"gabarito_url" text,
	"imported_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"subject_id" uuid,
	"subsubject_id" uuid,
	"microtopic_id" uuid,
	"training_id" uuid,
	"difficulty" "difficulty" DEFAULT 'medium',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(300) NOT NULL,
	"status" "import_status" DEFAULT 'pending' NOT NULL,
	"count_exams" integer DEFAULT 0,
	"count_questions" integer DEFAULT 0,
	"imported_by" uuid,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"notes" text,
	"error_log" text
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"subject_id" uuid,
	"subsubject_id" uuid,
	"microtopic_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(300) NOT NULL,
	"original_name" varchar(300) NOT NULL,
	"file_type" "file_type" NOT NULL,
	"url" text NOT NULL,
	"size_bytes" integer,
	"subject_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"previous_version_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "microtopics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subsubject_id" uuid NOT NULL,
	"name" varchar(300) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid,
	"subsubject_id" uuid,
	"microtopic_id" uuid,
	"rank" integer NOT NULL,
	"probability" real NOT NULL,
	"frequency_historical" real DEFAULT 0,
	"frequency_recent" real DEFAULT 0,
	"trend" "trend" DEFAULT 'stable',
	"justification" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"generated_for_exam" integer
);
--> statement-breakpoint
CREATE TABLE "simulation_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"simulation_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(300) NOT NULL,
	"type" "simulation_type" NOT NULL,
	"subject_id" uuid,
	"total_questions" integer DEFAULT 40 NOT NULL,
	"time_limit_minutes" integer DEFAULT 300,
	"training_id" uuid,
	"is_adaptive" boolean DEFAULT false,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statistics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid,
	"subsubject_id" uuid,
	"microtopic_id" uuid,
	"total_questions" integer DEFAULT 0 NOT NULL,
	"percentage_historical" real DEFAULT 0,
	"avg_per_exam" real DEFAULT 0,
	"trend" "trend" DEFAULT 'stable',
	"presence_in_exams" integer DEFAULT 0,
	"total_exams" integer DEFAULT 0,
	"last_calculated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "student_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"student_simulation_id" uuid,
	"answer" varchar(1) NOT NULL,
	"is_correct" boolean NOT NULL,
	"time_spent_seconds" integer DEFAULT 0,
	"answered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_flashcard_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"flashcard_id" uuid NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"last_reviewed" timestamp,
	"next_review" timestamp,
	"ease_factor" real DEFAULT 2.5,
	"interval" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "student_simulations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"simulation_id" uuid NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"total_answered" integer DEFAULT 0,
	"total_correct" integer DEFAULT 0,
	"score" real DEFAULT 0,
	"percentage" real DEFAULT 0,
	"time_spent_seconds" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "student_training_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"training_id" uuid NOT NULL,
	"current_day" integer DEFAULT 1 NOT NULL,
	"completed_topics" jsonb DEFAULT '[]'::jsonb,
	"started_at" timestamp DEFAULT now(),
	"last_accessed_at" timestamp,
	"completed_at" timestamp,
	"xp_earned" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(7) DEFAULT '#2563EB',
	"icon" varchar(50),
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "subsubjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_id" uuid NOT NULL,
	"day_number" integer NOT NULL,
	"date" date,
	"title" varchar(300) NOT NULL,
	"description" text,
	"estimated_hours" real DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_day_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"title" varchar(300) NOT NULL,
	"type" "topic_type" NOT NULL,
	"subject_id" uuid,
	"subsubject_id" uuid,
	"microtopic_id" uuid,
	"content" jsonb,
	"estimated_minutes" integer DEFAULT 30,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"changes_description" text,
	"changed_by" uuid NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trainings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(300) NOT NULL,
	"description" text,
	"hours_per_day" real NOT NULL,
	"days_count" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "training_status" DEFAULT 'draft' NOT NULL,
	"target_exam" integer,
	"current_version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"achievement_id" uuid NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(200) NOT NULL,
	"avatar_url" text,
	"role" "role" DEFAULT 'student' NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_id_unique" UNIQUE("auth_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(300) NOT NULL,
	"url" text NOT NULL,
	"video_type" "video_type" NOT NULL,
	"subject_id" uuid,
	"subsubject_id" uuid,
	"microtopic_id" uuid,
	"duration_seconds" integer,
	"thumbnail_url" text,
	"description" text,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apostilas" ADD CONSTRAINT "apostilas_training_topic_id_training_topics_id_fk" FOREIGN KEY ("training_topic_id") REFERENCES "public"."training_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apostilas" ADD CONSTRAINT "apostilas_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apostilas" ADD CONSTRAINT "apostilas_subsubject_id_subsubjects_id_fk" FOREIGN KEY ("subsubject_id") REFERENCES "public"."subsubjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apostilas" ADD CONSTRAINT "apostilas_microtopic_id_microtopics_id_fk" FOREIGN KEY ("microtopic_id") REFERENCES "public"."microtopics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_training_id_trainings_id_fk" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_notebook" ADD CONSTRAINT "error_notebook_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_notebook" ADD CONSTRAINT "error_notebook_question_id_exam_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."exam_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_subsubject_id_subsubjects_id_fk" FOREIGN KEY ("subsubject_id") REFERENCES "public"."subsubjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_microtopic_id_microtopics_id_fk" FOREIGN KEY ("microtopic_id") REFERENCES "public"."microtopics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_subsubject_id_subsubjects_id_fk" FOREIGN KEY ("subsubject_id") REFERENCES "public"."subsubjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_microtopic_id_microtopics_id_fk" FOREIGN KEY ("microtopic_id") REFERENCES "public"."microtopics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_training_id_trainings_id_fk" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_history" ADD CONSTRAINT "import_history_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_file_id_knowledge_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."knowledge_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_subsubject_id_subsubjects_id_fk" FOREIGN KEY ("subsubject_id") REFERENCES "public"."subsubjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_microtopic_id_microtopics_id_fk" FOREIGN KEY ("microtopic_id") REFERENCES "public"."microtopics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_files" ADD CONSTRAINT "knowledge_files_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_files" ADD CONSTRAINT "knowledge_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microtopics" ADD CONSTRAINT "microtopics_subsubject_id_subsubjects_id_fk" FOREIGN KEY ("subsubject_id") REFERENCES "public"."subsubjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_subsubject_id_subsubjects_id_fk" FOREIGN KEY ("subsubject_id") REFERENCES "public"."subsubjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_microtopic_id_microtopics_id_fk" FOREIGN KEY ("microtopic_id") REFERENCES "public"."microtopics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_questions" ADD CONSTRAINT "simulation_questions_simulation_id_simulations_id_fk" FOREIGN KEY ("simulation_id") REFERENCES "public"."simulations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_questions" ADD CONSTRAINT "simulation_questions_question_id_exam_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."exam_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_training_id_trainings_id_fk" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statistics" ADD CONSTRAINT "statistics_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statistics" ADD CONSTRAINT "statistics_subsubject_id_subsubjects_id_fk" FOREIGN KEY ("subsubject_id") REFERENCES "public"."subsubjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statistics" ADD CONSTRAINT "statistics_microtopic_id_microtopics_id_fk" FOREIGN KEY ("microtopic_id") REFERENCES "public"."microtopics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_question_id_exam_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."exam_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_student_simulation_id_student_simulations_id_fk" FOREIGN KEY ("student_simulation_id") REFERENCES "public"."student_simulations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_flashcard_progress" ADD CONSTRAINT "student_flashcard_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_flashcard_progress" ADD CONSTRAINT "student_flashcard_progress_flashcard_id_flashcards_id_fk" FOREIGN KEY ("flashcard_id") REFERENCES "public"."flashcards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_simulations" ADD CONSTRAINT "student_simulations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_simulations" ADD CONSTRAINT "student_simulations_simulation_id_simulations_id_fk" FOREIGN KEY ("simulation_id") REFERENCES "public"."simulations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_training_progress" ADD CONSTRAINT "student_training_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_training_progress" ADD CONSTRAINT "student_training_progress_training_id_trainings_id_fk" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subsubjects" ADD CONSTRAINT "subsubjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_days" ADD CONSTRAINT "training_days_training_id_trainings_id_fk" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_topics" ADD CONSTRAINT "training_topics_training_day_id_training_days_id_fk" FOREIGN KEY ("training_day_id") REFERENCES "public"."training_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_topics" ADD CONSTRAINT "training_topics_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_topics" ADD CONSTRAINT "training_topics_subsubject_id_subsubjects_id_fk" FOREIGN KEY ("subsubject_id") REFERENCES "public"."subsubjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_topics" ADD CONSTRAINT "training_topics_microtopic_id_microtopics_id_fk" FOREIGN KEY ("microtopic_id") REFERENCES "public"."microtopics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_versions" ADD CONSTRAINT "training_versions_training_id_trainings_id_fk" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_versions" ADD CONSTRAINT "training_versions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_subsubject_id_subsubjects_id_fk" FOREIGN KEY ("subsubject_id") REFERENCES "public"."subsubjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_microtopic_id_microtopics_id_fk" FOREIGN KEY ("microtopic_id") REFERENCES "public"."microtopics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_gen_type_idx" ON "ai_generations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "apostilas_subject_idx" ON "apostilas" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "certificates_user_idx" ON "certificates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "error_notebook_user_idx" ON "error_notebook" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "error_notebook_review_idx" ON "error_notebook" USING btree ("next_review_at");--> statement-breakpoint
CREATE INDEX "exam_questions_exam_idx" ON "exam_questions" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "exam_questions_subject_idx" ON "exam_questions" USING btree ("subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exams_number_year_idx" ON "exams" USING btree ("exam_number","year");--> statement-breakpoint
CREATE INDEX "flashcards_subject_idx" ON "flashcards" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_file_idx" ON "knowledge_chunks" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_subject_idx" ON "knowledge_chunks" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "knowledge_files_subject_idx" ON "knowledge_files" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "microtopics_subsubject_idx" ON "microtopics" USING btree ("subsubject_id");--> statement-breakpoint
CREATE INDEX "sim_questions_sim_idx" ON "simulation_questions" USING btree ("simulation_id");--> statement-breakpoint
CREATE INDEX "student_answers_user_idx" ON "student_answers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "student_answers_question_idx" ON "student_answers" USING btree ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sfp_user_flashcard_idx" ON "student_flashcard_progress" USING btree ("user_id","flashcard_id");--> statement-breakpoint
CREATE INDEX "sfp_next_review_idx" ON "student_flashcard_progress" USING btree ("next_review");--> statement-breakpoint
CREATE INDEX "student_sims_user_idx" ON "student_simulations" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stp_user_training_idx" ON "student_training_progress" USING btree ("user_id","training_id");--> statement-breakpoint
CREATE INDEX "subsubjects_subject_idx" ON "subsubjects" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "training_days_training_idx" ON "training_days" USING btree ("training_id");--> statement-breakpoint
CREATE INDEX "training_topics_day_idx" ON "training_topics" USING btree ("training_day_id");--> statement-breakpoint
CREATE INDEX "training_versions_training_idx" ON "training_versions" USING btree ("training_id");--> statement-breakpoint
CREATE INDEX "trainings_status_idx" ON "trainings" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "ua_user_achievement_idx" ON "user_achievements" USING btree ("user_id","achievement_id");--> statement-breakpoint
CREATE INDEX "videos_subject_idx" ON "videos" USING btree ("subject_id");