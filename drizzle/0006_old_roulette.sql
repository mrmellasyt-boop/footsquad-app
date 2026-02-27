CREATE TABLE `challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`city` varchar(100) NOT NULL,
	`format` enum('5v5','8v8','11v11') NOT NULL,
	`preferredDate` varchar(100),
	`message` text,
	`status` enum('open','accepted','cancelled') NOT NULL DEFAULT 'open',
	`matchId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `challenges_id` PRIMARY KEY(`id`)
);
