ALTER TABLE `orders` MODIFY COLUMN `kind` enum('training','lifetime','ebook') NOT NULL;--> statement-breakpoint
ALTER TABLE `ebooks` ADD `file_path` varchar(500);--> statement-breakpoint
ALTER TABLE `ebooks` ADD `cover_url` text;--> statement-breakpoint
ALTER TABLE `ebooks` ADD `price_cents` int;--> statement-breakpoint
ALTER TABLE `ebooks` ADD `training_id` varchar(36);--> statement-breakpoint
ALTER TABLE `orders` ADD `ebook_id` varchar(36);--> statement-breakpoint
ALTER TABLE `ebooks` ADD CONSTRAINT `ebooks_training_id_trainings_id_fk` FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_ebook_id_ebooks_id_fk` FOREIGN KEY (`ebook_id`) REFERENCES `ebooks`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Ebook de Ética: arquivo privado (content/ebooks), capa, e liberado junto com o treinamento de Ética
UPDATE `ebooks` SET `file_path` = 'bundled:ebook-etica-descomplicando-oab.pdf', `cover_url` = '/ebooks/capa-ebook-etica.webp', `training_id` = (SELECT `id` FROM `trainings` WHERE `id` = '51eacdc1-6ecc-4404-afd8-cf7b1ea56b74') WHERE `id` = 'cb66987f-9830-53ca-a59f-5126ca9b3716';--> statement-breakpoint
-- As leituras do treinamento passam a abrir o ebook pela rota que confere a compra
UPDATE `apostilas` SET `pdf_url` = '/api/ebooks/cb66987f-9830-53ca-a59f-5126ca9b3716/file', `content_html` = REPLACE(`content_html`, '/materiais/ebook-etica-descomplicando-oab.pdf', '/api/ebooks/cb66987f-9830-53ca-a59f-5126ca9b3716/file') WHERE `pdf_url` = '/materiais/ebook-etica-descomplicando-oab.pdf';--> statement-breakpoint
UPDATE `knowledge_files` SET `url` = '/api/ebooks/cb66987f-9830-53ca-a59f-5126ca9b3716/file' WHERE `url` = '/materiais/ebook-etica-descomplicando-oab.docx';
