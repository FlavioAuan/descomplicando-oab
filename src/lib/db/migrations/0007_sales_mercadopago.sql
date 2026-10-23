CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`kind` enum('training','lifetime') NOT NULL,
	`training_id` varchar(36),
	`title` varchar(300) NOT NULL,
	`amount_cents` int NOT NULL,
	`status` enum('pending','approved','rejected','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`mp_preference_id` varchar(100),
	`mp_payment_id` varchar(50),
	`mp_status` varchar(50),
	`paid_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `trainings` ADD `price_cents` int;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_training_id_trainings_id_fk` FOREIGN KEY (`training_id`) REFERENCES `trainings`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);