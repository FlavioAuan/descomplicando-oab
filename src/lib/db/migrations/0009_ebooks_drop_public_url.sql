-- Ebooks sem arquivo privado ficam marcados (a rota de download responde 404) antes de tornar file_path obrigatório
UPDATE `ebooks` SET `file_path` = CONCAT('missing:', `pdf_url`) WHERE `file_path` IS NULL;--> statement-breakpoint
ALTER TABLE `ebooks` MODIFY COLUMN `file_path` varchar(500) NOT NULL;--> statement-breakpoint
ALTER TABLE `ebooks` DROP COLUMN `pdf_url`;