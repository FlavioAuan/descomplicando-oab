CREATE TABLE `ebook_topics` (
	`id` varchar(36) NOT NULL,
	`subject_id` varchar(36) NOT NULL,
	`name` varchar(300) NOT NULL,
	`order` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ebook_topics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `exam_questions` ADD `ebook_topic_id` varchar(36);--> statement-breakpoint
ALTER TABLE `ebook_topics` ADD CONSTRAINT `ebook_topics_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ebook_topics_subject_idx` ON `ebook_topics` (`subject_id`);--> statement-breakpoint
ALTER TABLE `exam_questions` ADD CONSTRAINT `exam_questions_ebook_topic_id_ebook_topics_id_fk` FOREIGN KEY (`ebook_topic_id`) REFERENCES `ebook_topics`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO `ebook_topics` (`id`, `subject_id`, `name`, `order`)
SELECT UUID(), s.`id`, t.`name`, t.`ord` FROM `subjects` s
JOIN (
  SELECT 1 AS `ord`, 'Direitos e prerrogativas do advogado' AS `name`
  UNION ALL SELECT 2 AS `ord`, 'Honorários advocatícios' AS `name`
  UNION ALL SELECT 3 AS `ord`, 'Infrações e sanções disciplinares' AS `name`
  UNION ALL SELECT 4 AS `ord`, 'Sociedade de advogados e advogado associado' AS `name`
  UNION ALL SELECT 5 AS `ord`, 'Relações com o cliente' AS `name`
  UNION ALL SELECT 6 AS `ord`, 'Publicidade profissional' AS `name`
  UNION ALL SELECT 7 AS `ord`, 'Atividade de advocacia' AS `name`
  UNION ALL SELECT 8 AS `ord`, 'Inscrição na OAB' AS `name`
  UNION ALL SELECT 9 AS `ord`, 'OAB: natureza, fins e órgãos' AS `name`
  UNION ALL SELECT 10 AS `ord`, 'Processo disciplinar' AS `name`
  UNION ALL SELECT 11 AS `ord`, 'Incompatibilidades e impedimentos' AS `name`
  UNION ALL SELECT 12 AS `ord`, 'Estágio e estagiário' AS `name`
  UNION ALL SELECT 13 AS `ord`, 'Sigilo profissional' AS `name`
  UNION ALL SELECT 14 AS `ord`, 'Deveres éticos e princípios fundamentais' AS `name`
  UNION ALL SELECT 15 AS `ord`, 'Eleições e mandatos na OAB' AS `name`
  UNION ALL SELECT 16 AS `ord`, 'Advogado empregado' AS `name`
  UNION ALL SELECT 17 AS `ord`, 'Recursos e prazos nos processos da OAB' AS `name`
  UNION ALL SELECT 18 AS `ord`, 'Advocacia pro bono' AS `name`
  UNION ALL SELECT 19 AS `ord`, 'Advocacia pública' AS `name`
  UNION ALL SELECT 20 AS `ord`, 'Exercício de cargos e funções na OAB' AS `name`
  UNION ALL SELECT 21 AS `ord`, 'Diversos' AS `name`
) t
WHERE s.`name` = 'Estatuto da Advocacia e Ética Profissional';
