ALTER TABLE `match_players` ADD `teamSide` enum('A','B') DEFAULT 'A' NOT NULL;--> statement-breakpoint
ALTER TABLE `match_players` ADD `joinStatus` enum('pending','approved','declined') DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` ADD `maxPlayersPerTeam` int DEFAULT 5 NOT NULL;