ALTER TABLE `matches` MODIFY COLUMN `status` enum('pending','confirmed','in_progress','completed','cancelled','null_result') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `matches` ADD `scoreSubmittedByA` varchar(10);--> statement-breakpoint
ALTER TABLE `matches` ADD `scoreSubmittedByB` varchar(10);--> statement-breakpoint
ALTER TABLE `matches` ADD `scoreConflict` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` ADD `scoreConflictCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` ADD `motmWinnerId` int;