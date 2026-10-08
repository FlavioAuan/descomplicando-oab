CREATE TABLE `achievements` (
	`id` varchar(36) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`icon` varchar(100),
	`xp_reward` int NOT NULL DEFAULT 100,
	`condition` json NOT NULL,
	`rarity` varchar(20) DEFAULT 'common',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_generations` (
	`id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`entity_id` varchar(36),
	`entity_type` varchar(50),
	`input_tokens` int DEFAULT 0,
	`output_tokens` int DEFAULT 0,
	`model` varchar(100),
	`duration_ms` int,
	`success` boolean DEFAULT true,
	`error` text,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_generations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `apostilas` (
	`id` varchar(36) NOT NULL,
	`training_topic_id` varchar(36),
	`subject_id` varchar(36),
	`subsubject_id` varchar(36),
	`microtopic_id` varchar(36),
	`title` varchar(300) NOT NULL,
	`content_html` longtext NOT NULL,
	`pdf_url` text,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`generated_by` varchar(50) DEFAULT 'claude',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `apostilas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `certificates` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`training_id` varchar(36) NOT NULL,
	`hours_completed` double NOT NULL,
	`average_score` double NOT NULL,
	`issued_at` timestamp NOT NULL DEFAULT (now()),
	`pdf_url` text,
	`code` varchar(50),
	CONSTRAINT `certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificates_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `error_notebook` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`question_id` varchar(36) NOT NULL,
	`error_answer` varchar(1) NOT NULL,
	`correct_answer` varchar(1) NOT NULL,
	`review_count` int NOT NULL DEFAULT 0,
	`next_review_at` timestamp,
	`last_reviewed_at` timestamp,
	`mastered` boolean DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `error_notebook_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_questions` (
	`id` varchar(36) NOT NULL,
	`exam_id` varchar(36) NOT NULL,
	`number` int NOT NULL,
	`statement` longtext NOT NULL,
	`alternatives` json NOT NULL,
	`correct_answer` varchar(1) NOT NULL,
	`subject_id` varchar(36),
	`subsubject_id` varchar(36),
	`microtopic_id` varchar(36),
	`difficulty` enum('easy','medium','hard') DEFAULT 'medium',
	`classified` boolean DEFAULT false,
	`classified_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exam_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` varchar(36) NOT NULL,
	`exam_number` int NOT NULL,
	`year` int NOT NULL,
	`exam_date` date,
	`phase` varchar(20) DEFAULT '1a fase',
	`total_questions` int DEFAULT 0,
	`pdf_url` text,
	`gabarito_url` text,
	`imported_at` timestamp,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exams_id` PRIMARY KEY(`id`),
	CONSTRAINT `exams_number_year_idx` UNIQUE(`exam_number`,`year`)
);
--> statement-breakpoint
CREATE TABLE `exercise_questions` (
	`id` varchar(36) NOT NULL,
	`set_id` varchar(36) NOT NULL,
	`order` int NOT NULL,
	`statement` longtext NOT NULL,
	`alternatives` json NOT NULL,
	`correct_answer` varchar(1) NOT NULL,
	`explanation` text,
	CONSTRAINT `exercise_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exercise_sets` (
	`id` varchar(36) NOT NULL,
	`title` varchar(300) NOT NULL,
	`apostila_id` varchar(36),
	`subject_id` varchar(36),
	`question_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exercise_sets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flashcard_set_cards` (
	`id` varchar(36) NOT NULL,
	`set_id` varchar(36) NOT NULL,
	`order` int NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`difficulty` enum('easy','medium','hard') DEFAULT 'medium',
	CONSTRAINT `flashcard_set_cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flashcard_sets` (
	`id` varchar(36) NOT NULL,
	`title` varchar(300) NOT NULL,
	`apostila_id` varchar(36),
	`subject_id` varchar(36),
	`card_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `flashcard_sets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flashcards` (
	`id` varchar(36) NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`subject_id` varchar(36),
	`subsubject_id` varchar(36),
	`microtopic_id` varchar(36),
	`training_id` varchar(36),
	`difficulty` enum('easy','medium','hard') DEFAULT 'medium',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `flashcards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `import_history` (
	`id` varchar(36) NOT NULL,
	`source` varchar(300) NOT NULL,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`count_exams` int DEFAULT 0,
	`count_questions` int DEFAULT 0,
	`imported_by` varchar(36),
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	`notes` text,
	`error_log` longtext,
	CONSTRAINT `import_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_chunks` (
	`id` varchar(36) NOT NULL,
	`file_id` varchar(36) NOT NULL,
	`content` longtext NOT NULL,
	`chunk_index` int NOT NULL,
	`subject_id` varchar(36),
	`subsubject_id` varchar(36),
	`microtopic_id` varchar(36),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledge_chunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_files` (
	`id` varchar(36) NOT NULL,
	`name` varchar(300) NOT NULL,
	`original_name` varchar(300) NOT NULL,
	`file_type` enum('pdf','docx','txt','epub','pptx') NOT NULL,
	`url` text NOT NULL,
	`size_bytes` int,
	`subject_id` varchar(36),
	`version` int NOT NULL DEFAULT 1,
	`previous_version_id` varchar(36),
	`is_active` boolean NOT NULL DEFAULT true,
	`uploaded_by` varchar(36) NOT NULL,
	`processed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledge_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `microtopics` (
	`id` varchar(36) NOT NULL,
	`subsubject_id` varchar(36) NOT NULL,
	`name` varchar(300) NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `microtopics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` varchar(36) NOT NULL,
	`subject_id` varchar(36),
	`subsubject_id` varchar(36),
	`microtopic_id` varchar(36),
	`rank` int NOT NULL,
	`probability` double NOT NULL,
	`frequency_historical` double DEFAULT 0,
	`frequency_recent` double DEFAULT 0,
	`trend` enum('growing','stable','declining') DEFAULT 'stable',
	`justification` text,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`generated_for_exam` int,
	CONSTRAINT `predictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulation_questions` (
	`id` varchar(36) NOT NULL,
	`simulation_id` varchar(36) NOT NULL,
	`question_id` varchar(36) NOT NULL,
	`order` int NOT NULL,
	CONSTRAINT `simulation_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulations` (
	`id` varchar(36) NOT NULL,
	`name` varchar(300) NOT NULL,
	`type` enum('general','subject','topic','predicted','adaptive') NOT NULL,
	`subject_id` varchar(36),
	`total_questions` int NOT NULL DEFAULT 40,
	`time_limit_minutes` int DEFAULT 300,
	`training_id` varchar(36),
	`is_adaptive` boolean DEFAULT false,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `simulations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `statistics` (
	`id` varchar(36) NOT NULL,
	`subject_id` varchar(36),
	`subsubject_id` varchar(36),
	`microtopic_id` varchar(36),
	`total_questions` int NOT NULL DEFAULT 0,
	`percentage_historical` double DEFAULT 0,
	`avg_per_exam` double DEFAULT 0,
	`trend` enum('growing','stable','declining') DEFAULT 'stable',
	`presence_in_exams` int DEFAULT 0,
	`total_exams` int DEFAULT 0,
	`last_calculated` timestamp DEFAULT (now()),
	CONSTRAINT `statistics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_answers` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`question_id` varchar(36) NOT NULL,
	`student_simulation_id` varchar(36),
	`answer` varchar(1) NOT NULL,
	`is_correct` boolean NOT NULL,
	`time_spent_seconds` int DEFAULT 0,
	`answered_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `student_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_exercise_progress` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`set_id` varchar(36) NOT NULL,
	`answers` json NOT NULL,
	`total_correct` int DEFAULT 0,
	`total_questions` int DEFAULT 0,
	`completed_at` timestamp,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `student_exercise_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `sep_user_set_idx` UNIQUE(`user_id`,`set_id`)
);
--> statement-breakpoint
CREATE TABLE `student_flashcard_progress` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`flashcard_id` varchar(36) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`correct` int NOT NULL DEFAULT 0,
	`last_reviewed` timestamp,
	`next_review` timestamp,
	`ease_factor` double DEFAULT 2.5,
	`interval` int DEFAULT 1,
	CONSTRAINT `student_flashcard_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `sfp_user_flashcard_idx` UNIQUE(`user_id`,`flashcard_id`)
);
--> statement-breakpoint
CREATE TABLE `student_simulations` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`simulation_id` varchar(36) NOT NULL,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	`total_answered` int DEFAULT 0,
	`total_correct` int DEFAULT 0,
	`score` double DEFAULT 0,
	`percentage` double DEFAULT 0,
	`time_spent_seconds` int DEFAULT 0,
	CONSTRAINT `student_simulations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_training_progress` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`training_id` varchar(36) NOT NULL,
	`current_day` int NOT NULL DEFAULT 1,
	`completed_topics` json,
	`started_at` timestamp DEFAULT (now()),
	`last_accessed_at` timestamp,
	`completed_at` timestamp,
	`xp_earned` int DEFAULT 0,
	CONSTRAINT `student_training_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `stp_user_training_idx` UNIQUE(`user_id`,`training_id`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`color` varchar(7) DEFAULT '#2563EB',
	`icon` varchar(50),
	`order` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `subjects_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `subsubjects` (
	`id` varchar(36) NOT NULL,
	`subject_id` varchar(36) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subsubjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`key` varchar(100) NOT NULL,
	`value` longtext NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `training_days` (
	`id` varchar(36) NOT NULL,
	`training_id` varchar(36) NOT NULL,
	`day_number` int NOT NULL,
	`date` date,
	`title` varchar(300) NOT NULL,
	`description` text,
	`estimated_hours` double DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `training_days_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `training_topics` (
	`id` varchar(36) NOT NULL,
	`training_day_id` varchar(36) NOT NULL,
	`order` int NOT NULL,
	`title` varchar(300) NOT NULL,
	`type` enum('apostila','flashcard','exercise','simulation','video','review') NOT NULL,
	`subject_id` varchar(36),
	`subsubject_id` varchar(36),
	`microtopic_id` varchar(36),
	`content` json,
	`estimated_minutes` int DEFAULT 30,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `training_topics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `training_versions` (
	`id` varchar(36) NOT NULL,
	`training_id` varchar(36) NOT NULL,
	`version_number` int NOT NULL,
	`snapshot` json NOT NULL,
	`changes_description` text,
	`changed_by` varchar(36) NOT NULL,
	`changed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `training_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trainings` (
	`id` varchar(36) NOT NULL,
	`name` varchar(300) NOT NULL,
	`description` text,
	`hours_per_day` double NOT NULL,
	`days_count` int NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`status` enum('draft','review','approved','archived') NOT NULL DEFAULT 'draft',
	`target_exam` int,
	`current_version` int NOT NULL DEFAULT 1,
	`created_by` varchar(36) NOT NULL,
	`approved_by` varchar(36),
	`approved_at` timestamp,
	`published_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trainings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`achievement_id` varchar(36) NOT NULL,
	`earned_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_achievements_id` PRIMARY KEY(`id`),
	CONSTRAINT `ua_user_achievement_idx` UNIQUE(`user_id`,`achievement_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`auth_id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255),
	`name` varchar(200) NOT NULL,
	`avatar_url` text,
	`role` enum('super_admin','admin','student') NOT NULL DEFAULT 'student',
	`xp` int NOT NULL DEFAULT 0,
	`level` int NOT NULL DEFAULT 1,
	`streak` int NOT NULL DEFAULT 0,
	`last_active_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_auth_id_unique` UNIQUE(`auth_id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` varchar(36) NOT NULL,
	`title` varchar(300) NOT NULL,
	`url` text NOT NULL,
	`video_type` enum('youtube','upload') NOT NULL,
	`subject_id` varchar(36),
	`subsubject_id` varchar(36),
	`microtopic_id` varchar(36),
	`duration_seconds` int,
	`thumbnail_url` text,
	`description` text,
	`uploaded_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `videos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ai_generations` ADD CONSTRAINT `ai_generations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `apostilas` ADD CONSTRAINT `apostilas_training_topic_id_training_topics_id_fk` FOREIGN KEY (`training_topic_id`) REFERENCES `training_topics`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `apostilas` ADD CONSTRAINT `apostilas_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `apostilas` ADD CONSTRAINT `apostilas_subsubject_id_subsubjects_id_fk` FOREIGN KEY (`subsubject_id`) REFERENCES `subsubjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `apostilas` ADD CONSTRAINT `apostilas_microtopic_id_microtopics_id_fk` FOREIGN KEY (`microtopic_id`) REFERENCES `microtopics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_training_id_trainings_id_fk` FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `error_notebook` ADD CONSTRAINT `error_notebook_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `error_notebook` ADD CONSTRAINT `error_notebook_question_id_exam_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `exam_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_questions` ADD CONSTRAINT `exam_questions_exam_id_exams_id_fk` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_questions` ADD CONSTRAINT `exam_questions_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_questions` ADD CONSTRAINT `exam_questions_subsubject_id_subsubjects_id_fk` FOREIGN KEY (`subsubject_id`) REFERENCES `subsubjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exam_questions` ADD CONSTRAINT `exam_questions_microtopic_id_microtopics_id_fk` FOREIGN KEY (`microtopic_id`) REFERENCES `microtopics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exercise_questions` ADD CONSTRAINT `exercise_questions_set_id_exercise_sets_id_fk` FOREIGN KEY (`set_id`) REFERENCES `exercise_sets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exercise_sets` ADD CONSTRAINT `exercise_sets_apostila_id_apostilas_id_fk` FOREIGN KEY (`apostila_id`) REFERENCES `apostilas`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exercise_sets` ADD CONSTRAINT `exercise_sets_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcard_set_cards` ADD CONSTRAINT `flashcard_set_cards_set_id_flashcard_sets_id_fk` FOREIGN KEY (`set_id`) REFERENCES `flashcard_sets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcard_sets` ADD CONSTRAINT `flashcard_sets_apostila_id_apostilas_id_fk` FOREIGN KEY (`apostila_id`) REFERENCES `apostilas`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcard_sets` ADD CONSTRAINT `flashcard_sets_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcards` ADD CONSTRAINT `flashcards_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcards` ADD CONSTRAINT `flashcards_subsubject_id_subsubjects_id_fk` FOREIGN KEY (`subsubject_id`) REFERENCES `subsubjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcards` ADD CONSTRAINT `flashcards_microtopic_id_microtopics_id_fk` FOREIGN KEY (`microtopic_id`) REFERENCES `microtopics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcards` ADD CONSTRAINT `flashcards_training_id_trainings_id_fk` FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `import_history` ADD CONSTRAINT `import_history_imported_by_users_id_fk` FOREIGN KEY (`imported_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_chunks` ADD CONSTRAINT `knowledge_chunks_file_id_knowledge_files_id_fk` FOREIGN KEY (`file_id`) REFERENCES `knowledge_files`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_chunks` ADD CONSTRAINT `knowledge_chunks_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_chunks` ADD CONSTRAINT `knowledge_chunks_subsubject_id_subsubjects_id_fk` FOREIGN KEY (`subsubject_id`) REFERENCES `subsubjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_chunks` ADD CONSTRAINT `knowledge_chunks_microtopic_id_microtopics_id_fk` FOREIGN KEY (`microtopic_id`) REFERENCES `microtopics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_files` ADD CONSTRAINT `knowledge_files_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_files` ADD CONSTRAINT `knowledge_files_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `microtopics` ADD CONSTRAINT `microtopics_subsubject_id_subsubjects_id_fk` FOREIGN KEY (`subsubject_id`) REFERENCES `subsubjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `predictions` ADD CONSTRAINT `predictions_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `predictions` ADD CONSTRAINT `predictions_subsubject_id_subsubjects_id_fk` FOREIGN KEY (`subsubject_id`) REFERENCES `subsubjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `predictions` ADD CONSTRAINT `predictions_microtopic_id_microtopics_id_fk` FOREIGN KEY (`microtopic_id`) REFERENCES `microtopics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `simulation_questions` ADD CONSTRAINT `simulation_questions_simulation_id_simulations_id_fk` FOREIGN KEY (`simulation_id`) REFERENCES `simulations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `simulation_questions` ADD CONSTRAINT `simulation_questions_question_id_exam_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `exam_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `simulations` ADD CONSTRAINT `simulations_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `simulations` ADD CONSTRAINT `simulations_training_id_trainings_id_fk` FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `simulations` ADD CONSTRAINT `simulations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `statistics` ADD CONSTRAINT `statistics_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `statistics` ADD CONSTRAINT `statistics_subsubject_id_subsubjects_id_fk` FOREIGN KEY (`subsubject_id`) REFERENCES `subsubjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `statistics` ADD CONSTRAINT `statistics_microtopic_id_microtopics_id_fk` FOREIGN KEY (`microtopic_id`) REFERENCES `microtopics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_answers` ADD CONSTRAINT `student_answers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_answers` ADD CONSTRAINT `student_answers_question_id_exam_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `exam_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_answers` ADD CONSTRAINT `student_answers_student_simulation_id_student_simulations_id_fk` FOREIGN KEY (`student_simulation_id`) REFERENCES `student_simulations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_exercise_progress` ADD CONSTRAINT `student_exercise_progress_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_exercise_progress` ADD CONSTRAINT `student_exercise_progress_set_id_exercise_sets_id_fk` FOREIGN KEY (`set_id`) REFERENCES `exercise_sets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_flashcard_progress` ADD CONSTRAINT `student_flashcard_progress_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_flashcard_progress` ADD CONSTRAINT `student_flashcard_progress_flashcard_id_flashcards_id_fk` FOREIGN KEY (`flashcard_id`) REFERENCES `flashcards`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_simulations` ADD CONSTRAINT `student_simulations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_simulations` ADD CONSTRAINT `student_simulations_simulation_id_simulations_id_fk` FOREIGN KEY (`simulation_id`) REFERENCES `simulations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_training_progress` ADD CONSTRAINT `student_training_progress_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_training_progress` ADD CONSTRAINT `student_training_progress_training_id_trainings_id_fk` FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subsubjects` ADD CONSTRAINT `subsubjects_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `training_days` ADD CONSTRAINT `training_days_training_id_trainings_id_fk` FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `training_topics` ADD CONSTRAINT `training_topics_training_day_id_training_days_id_fk` FOREIGN KEY (`training_day_id`) REFERENCES `training_days`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `training_topics` ADD CONSTRAINT `training_topics_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `training_topics` ADD CONSTRAINT `training_topics_subsubject_id_subsubjects_id_fk` FOREIGN KEY (`subsubject_id`) REFERENCES `subsubjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `training_topics` ADD CONSTRAINT `training_topics_microtopic_id_microtopics_id_fk` FOREIGN KEY (`microtopic_id`) REFERENCES `microtopics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `training_versions` ADD CONSTRAINT `training_versions_training_id_trainings_id_fk` FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `training_versions` ADD CONSTRAINT `training_versions_changed_by_users_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trainings` ADD CONSTRAINT `trainings_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trainings` ADD CONSTRAINT `trainings_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_achievements` ADD CONSTRAINT `user_achievements_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_achievements` ADD CONSTRAINT `user_achievements_achievement_id_achievements_id_fk` FOREIGN KEY (`achievement_id`) REFERENCES `achievements`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_subsubject_id_subsubjects_id_fk` FOREIGN KEY (`subsubject_id`) REFERENCES `subsubjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_microtopic_id_microtopics_id_fk` FOREIGN KEY (`microtopic_id`) REFERENCES `microtopics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ai_gen_type_idx` ON `ai_generations` (`type`);--> statement-breakpoint
CREATE INDEX `apostilas_subject_idx` ON `apostilas` (`subject_id`);--> statement-breakpoint
CREATE INDEX `certificates_user_idx` ON `certificates` (`user_id`);--> statement-breakpoint
CREATE INDEX `error_notebook_user_idx` ON `error_notebook` (`user_id`);--> statement-breakpoint
CREATE INDEX `error_notebook_review_idx` ON `error_notebook` (`next_review_at`);--> statement-breakpoint
CREATE INDEX `exam_questions_exam_idx` ON `exam_questions` (`exam_id`);--> statement-breakpoint
CREATE INDEX `exam_questions_subject_idx` ON `exam_questions` (`subject_id`);--> statement-breakpoint
CREATE INDEX `eq_set_idx` ON `exercise_questions` (`set_id`);--> statement-breakpoint
CREATE INDEX `fsc_set_idx` ON `flashcard_set_cards` (`set_id`);--> statement-breakpoint
CREATE INDEX `flashcards_subject_idx` ON `flashcards` (`subject_id`);--> statement-breakpoint
CREATE INDEX `knowledge_chunks_file_idx` ON `knowledge_chunks` (`file_id`);--> statement-breakpoint
CREATE INDEX `knowledge_chunks_subject_idx` ON `knowledge_chunks` (`subject_id`);--> statement-breakpoint
CREATE INDEX `knowledge_files_subject_idx` ON `knowledge_files` (`subject_id`);--> statement-breakpoint
CREATE INDEX `microtopics_subsubject_idx` ON `microtopics` (`subsubject_id`);--> statement-breakpoint
CREATE INDEX `sim_questions_sim_idx` ON `simulation_questions` (`simulation_id`);--> statement-breakpoint
CREATE INDEX `student_answers_user_idx` ON `student_answers` (`user_id`);--> statement-breakpoint
CREATE INDEX `student_answers_question_idx` ON `student_answers` (`question_id`);--> statement-breakpoint
CREATE INDEX `sfp_next_review_idx` ON `student_flashcard_progress` (`next_review`);--> statement-breakpoint
CREATE INDEX `student_sims_user_idx` ON `student_simulations` (`user_id`);--> statement-breakpoint
CREATE INDEX `subsubjects_subject_idx` ON `subsubjects` (`subject_id`);--> statement-breakpoint
CREATE INDEX `training_days_training_idx` ON `training_days` (`training_id`);--> statement-breakpoint
CREATE INDEX `training_topics_day_idx` ON `training_topics` (`training_day_id`);--> statement-breakpoint
CREATE INDEX `training_versions_training_idx` ON `training_versions` (`training_id`);--> statement-breakpoint
CREATE INDEX `trainings_status_idx` ON `trainings` (`status`);--> statement-breakpoint
CREATE INDEX `videos_subject_idx` ON `videos` (`subject_id`);