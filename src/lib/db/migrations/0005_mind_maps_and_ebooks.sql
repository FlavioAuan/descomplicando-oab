CREATE TABLE `ebooks` (
	`id` varchar(36) NOT NULL,
	`subject_id` varchar(36),
	`title` varchar(300) NOT NULL,
	`description` text,
	`pdf_url` text NOT NULL,
	`size_bytes` int,
	`page_count` int,
	`order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ebooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mind_maps` (
	`id` varchar(36) NOT NULL,
	`subject_id` varchar(36),
	`title` varchar(300) NOT NULL,
	`chapter` int,
	`image_url` text NOT NULL,
	`pdf_url` text,
	`order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mind_maps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `training_topics` MODIFY COLUMN `type` enum('apostila','flashcard','exercise','simulation','video','review','mind_map') NOT NULL;--> statement-breakpoint
ALTER TABLE `ebooks` ADD CONSTRAINT `ebooks_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mind_maps` ADD CONSTRAINT `mind_maps_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ebooks_subject_idx` ON `ebooks` (`subject_id`);--> statement-breakpoint
CREATE INDEX `mind_maps_subject_idx` ON `mind_maps` (`subject_id`);--> statement-breakpoint
-- Dados: mapas mentais e ebook de Ética (scripts/build-etica-mind-maps.js)
INSERT INTO `ebooks` (`id`, `subject_id`, `title`, `description`, `pdf_url`, `size_bytes`, `page_count`, `order`)
VALUES ('cb66987f-9830-53ca-a59f-5126ca9b3716', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Ética — Descomplicando OAB (Edição 2026)', 'Estatuto da Advocacia, Regulamento Geral e Código de Ética e Disciplina em 20 capítulos, na ordem de incidência na prova, com raio-X, pegadinhas da FGV e questões comentadas.', '/materiais/ebook-etica-descomplicando-oab.pdf', 1044752, 78, 1);--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('bbcd47c2-dd36-52cf-a717-2f03db0037e2', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Direitos e prerrogativas do advogado', 1, '/mapas-mentais/etica/capitulo-01.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 1);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = '1f673d2e-8365-42dd-b07a-ab504c4a4ced' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT 'df1bf473-20e6-5ffd-aee2-c81491e416ea', `id`, 2, 'Mapa mental: Direitos e prerrogativas do advogado', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"bbcd47c2-dd36-52cf-a717-2f03db0037e2"}', 10
FROM `training_days` WHERE `id` = '1f673d2e-8365-42dd-b07a-ab504c4a4ced';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('a765fcf2-cab0-53dc-ab25-ce815ae9be66', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Honorários advocatícios', 2, '/mapas-mentais/etica/capitulo-02.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 2);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = 'a400ca8a-a906-4407-821d-2175b4cf037f' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT 'd8ad6ba1-5657-5a3e-abe6-50aaa8e14d33', `id`, 2, 'Mapa mental: Honorários advocatícios', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"a765fcf2-cab0-53dc-ab25-ce815ae9be66"}', 10
FROM `training_days` WHERE `id` = 'a400ca8a-a906-4407-821d-2175b4cf037f';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('77e51942-39c8-5002-a21e-893fd9caf36b', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Infrações e sanções disciplinares', 3, '/mapas-mentais/etica/capitulo-03.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 3);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = '8e588aaf-3b80-4d3d-a139-978d9c3badda' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT '123b72f4-7f0c-5793-ab60-179e677eda67', `id`, 2, 'Mapa mental: Infrações e sanções disciplinares', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"77e51942-39c8-5002-a21e-893fd9caf36b"}', 10
FROM `training_days` WHERE `id` = '8e588aaf-3b80-4d3d-a139-978d9c3badda';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('c9fab6a7-8935-58f7-ad74-515c7045266b', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Sociedade de advogados e advogado associado', 4, '/mapas-mentais/etica/capitulo-04.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 4);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = '93c28dd7-7c1a-41eb-84c2-90c4ea9c6c6b' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT 'cb10f329-9675-518d-a3f5-89c9b1a06fdc', `id`, 2, 'Mapa mental: Sociedade de advogados e advogado associado', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"c9fab6a7-8935-58f7-ad74-515c7045266b"}', 10
FROM `training_days` WHERE `id` = '93c28dd7-7c1a-41eb-84c2-90c4ea9c6c6b';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('09f31a03-ab37-50bc-a511-0aa49e738f45', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Relações com o cliente', 5, '/mapas-mentais/etica/capitulo-05.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 5);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = 'a6bec414-1f5e-4bbc-a3b6-8e6bb38cd46a' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT 'd160952c-9ef7-527e-af49-4122b167104f', `id`, 2, 'Mapa mental: Relações com o cliente', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"09f31a03-ab37-50bc-a511-0aa49e738f45"}', 10
FROM `training_days` WHERE `id` = 'a6bec414-1f5e-4bbc-a3b6-8e6bb38cd46a';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('b902ad42-28d3-5252-a444-c17821db6fa4', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Publicidade profissional', 6, '/mapas-mentais/etica/capitulo-06.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 6);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = '3ac3f52d-c0c1-4c39-88df-bd6c11e800de' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT 'b3a1d397-302a-5a89-af3c-0bb53fb79f2d', `id`, 2, 'Mapa mental: Publicidade profissional', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"b902ad42-28d3-5252-a444-c17821db6fa4"}', 10
FROM `training_days` WHERE `id` = '3ac3f52d-c0c1-4c39-88df-bd6c11e800de';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('744c9b97-57d5-50c7-a96e-df91fbcc7b1c', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Atividade de advocacia', 7, '/mapas-mentais/etica/capitulo-07.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 7);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = '83663853-03df-421e-8c58-e1c07ce37ac3' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT '59e22d85-7f4c-5d36-a4b4-581aebbc2fb1', `id`, 2, 'Mapa mental: Atividade de advocacia', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"744c9b97-57d5-50c7-a96e-df91fbcc7b1c"}', 10
FROM `training_days` WHERE `id` = '83663853-03df-421e-8c58-e1c07ce37ac3';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('2ce1654c-f454-5c64-ab40-b5c3261da363', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Inscrição na OAB', 8, '/mapas-mentais/etica/capitulo-08.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 8);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = 'd4044a92-5606-48c3-b125-afec904c4416' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT '8c9dd8a9-4fc2-5d91-a779-dfa0cd8bcbda', `id`, 2, 'Mapa mental: Inscrição na OAB', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"2ce1654c-f454-5c64-ab40-b5c3261da363"}', 10
FROM `training_days` WHERE `id` = 'd4044a92-5606-48c3-b125-afec904c4416';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('d370bcf0-9475-56ab-a3f7-03b6b29bd0e8', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'OAB: natureza, fins e órgãos', 9, '/mapas-mentais/etica/capitulo-09.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 9);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = 'c9e8f288-17f4-4725-8145-b0c840d3f501' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT '00895962-a2b3-5ce3-aa80-42461d4b15d0', `id`, 2, 'Mapa mental: OAB: natureza, fins e órgãos', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"d370bcf0-9475-56ab-a3f7-03b6b29bd0e8"}', 10
FROM `training_days` WHERE `id` = 'c9e8f288-17f4-4725-8145-b0c840d3f501';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('ae5e1acf-d1e3-5008-a55e-6bcaaa711468', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Processo disciplinar', 10, '/mapas-mentais/etica/capitulo-10.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 10);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = '9a71f5ce-8c64-4e24-b4d7-ce031dbeee24' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT 'd7e9f49a-827d-5baa-a511-6a5548832b43', `id`, 2, 'Mapa mental: Processo disciplinar', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"ae5e1acf-d1e3-5008-a55e-6bcaaa711468"}', 10
FROM `training_days` WHERE `id` = '9a71f5ce-8c64-4e24-b4d7-ce031dbeee24';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('5852ba2c-6ade-572b-af48-92e35f9b587b', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Incompatibilidades e impedimentos', 11, '/mapas-mentais/etica/capitulo-11.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 11);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = 'ad6b3d27-82d1-42ad-90b6-d099efb936e1' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT 'cc50e7a3-4073-51a0-abb9-9096de1f346c', `id`, 2, 'Mapa mental: Incompatibilidades e impedimentos', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"5852ba2c-6ade-572b-af48-92e35f9b587b"}', 10
FROM `training_days` WHERE `id` = 'ad6b3d27-82d1-42ad-90b6-d099efb936e1';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('45d34a40-e927-588c-a1ce-7463123448ba', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Estágio e estagiário', 12, '/mapas-mentais/etica/capitulo-12.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 12);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = '2016c70c-25f1-4479-a4d2-9fdaba3fcd99' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT 'aee17d9d-9097-5658-a64a-6b1d6db33bb2', `id`, 2, 'Mapa mental: Estágio e estagiário', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"45d34a40-e927-588c-a1ce-7463123448ba"}', 10
FROM `training_days` WHERE `id` = '2016c70c-25f1-4479-a4d2-9fdaba3fcd99';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('bf268812-97df-5865-accb-168501a1406f', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Sigilo profissional', 13, '/mapas-mentais/etica/capitulo-13.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 13);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = '0d8c03d9-dab6-49aa-96d7-426e177fd770' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT '7bab379b-686e-57b5-ab2a-5e6ce878511c', `id`, 2, 'Mapa mental: Sigilo profissional', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"bf268812-97df-5865-accb-168501a1406f"}', 10
FROM `training_days` WHERE `id` = '0d8c03d9-dab6-49aa-96d7-426e177fd770';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('3c3e3983-f77d-5aff-a8f4-5b748a6a78bb', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Deveres éticos e princípios fundamentais', 14, '/mapas-mentais/etica/capitulo-14.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 14);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = '1e784a60-e8a4-4ae1-8cc2-e426497c530e' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT '966c6606-4a98-505b-aaa4-68a5a9ce09d5', `id`, 2, 'Mapa mental: Deveres éticos e princípios fundamentais', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"3c3e3983-f77d-5aff-a8f4-5b748a6a78bb"}', 10
FROM `training_days` WHERE `id` = '1e784a60-e8a4-4ae1-8cc2-e426497c530e';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('b4bb5926-6b40-5bc2-add5-cc5693d7ff99', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Eleições e mandatos na OAB', 15, '/mapas-mentais/etica/capitulo-15.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 15);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = 'efce0438-6d7c-4cb2-83b8-6d85402edb40' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT '7c11a398-8109-53b0-af19-dc5972221ee0', `id`, 2, 'Mapa mental: Eleições e mandatos na OAB', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"b4bb5926-6b40-5bc2-add5-cc5693d7ff99"}', 10
FROM `training_days` WHERE `id` = 'efce0438-6d7c-4cb2-83b8-6d85402edb40';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('c77793f9-a66f-516e-ab37-1ac237e661fb', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Advogado empregado', 16, '/mapas-mentais/etica/capitulo-16.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 16);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = '6349df30-12f2-46cc-8c34-2e36d7a3ee41' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT 'f48d1fcb-8616-51a5-a047-b5aaf5dde6aa', `id`, 2, 'Mapa mental: Advogado empregado', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"c77793f9-a66f-516e-ab37-1ac237e661fb"}', 10
FROM `training_days` WHERE `id` = '6349df30-12f2-46cc-8c34-2e36d7a3ee41';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('1dc905be-eac7-5c24-accb-aa1e6e6989d7', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Recursos e prazos nos processos da OAB', 17, '/mapas-mentais/etica/capitulo-17.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 17);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = '18905b72-79c7-4fa7-8b54-92f5929f4e3d' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT '735c6f85-763c-5ba6-a0fc-dd23fec78b5f', `id`, 2, 'Mapa mental: Recursos e prazos nos processos da OAB', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"1dc905be-eac7-5c24-accb-aa1e6e6989d7"}', 10
FROM `training_days` WHERE `id` = '18905b72-79c7-4fa7-8b54-92f5929f4e3d';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('2999cb9c-117b-5600-a440-9051a2aae0b8', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Advocacia pro bono', 18, '/mapas-mentais/etica/capitulo-18.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 18);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = '00aa093c-a714-4db3-a204-a3b69e58fb42' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT '4cc4187f-224c-5b7d-a178-98204c9513a1', `id`, 2, 'Mapa mental: Advocacia pro bono', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"2999cb9c-117b-5600-a440-9051a2aae0b8"}', 10
FROM `training_days` WHERE `id` = '00aa093c-a714-4db3-a204-a3b69e58fb42';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('7dd5d111-9b39-5402-af4a-fccb73f8c154', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Advocacia pública', 19, '/mapas-mentais/etica/capitulo-19.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 19);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = '26ad7caa-fd6a-4201-948d-5891db04638e' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT 'b5934df4-cca8-579a-a70c-dec4037f5a84', `id`, 2, 'Mapa mental: Advocacia pública', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"7dd5d111-9b39-5402-af4a-fccb73f8c154"}', 10
FROM `training_days` WHERE `id` = '26ad7caa-fd6a-4201-948d-5891db04638e';--> statement-breakpoint
INSERT INTO `mind_maps` (`id`, `subject_id`, `title`, `chapter`, `image_url`, `pdf_url`, `order`)
VALUES ('993fdb0c-d1fc-554c-a363-ae93ec26320b', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), 'Exercício de cargos e funções na OAB', 20, '/mapas-mentais/etica/capitulo-20.webp', '/mapas-mentais/etica/mapas-mentais-etica-completo.pdf', 20);--> statement-breakpoint
UPDATE `training_topics` SET `order` = `order` + 1 WHERE `training_day_id` = '22ca3160-8416-4147-9f68-11897c8e921b' AND `order` >= 2;--> statement-breakpoint
INSERT INTO `training_topics` (`id`, `training_day_id`, `order`, `title`, `type`, `subject_id`, `content`, `estimated_minutes`)
SELECT '840e0326-2941-5bb3-a118-9f4e9d62aec6', `id`, 2, 'Mapa mental: Exercício de cargos e funções na OAB', 'mind_map', (SELECT `id` FROM `subjects` WHERE `name` = 'Estatuto da Advocacia e Ética Profissional' LIMIT 1), '{"mindMapId":"993fdb0c-d1fc-554c-a363-ae93ec26320b"}', 10
FROM `training_days` WHERE `id` = '22ca3160-8416-4147-9f68-11897c8e921b';--> statement-breakpoint
UPDATE `apostilas` SET `pdf_url` = '/materiais/ebook-etica-descomplicando-oab.pdf', `content_html` = REPLACE(`content_html`, '/materiais/ebook-etica-descomplicando-oab.docx', '/materiais/ebook-etica-descomplicando-oab.pdf') WHERE `pdf_url` = '/materiais/ebook-etica-descomplicando-oab.docx';
