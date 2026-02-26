CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('team','direct') NOT NULL,
	`senderId` int NOT NULL,
	`recipientId` int,
	`teamId` int,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`followerId` int NOT NULL,
	`followedId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `highlight_likes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`highlightId` int NOT NULL,
	`playerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `highlight_likes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `highlights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` int NOT NULL,
	`mediaUrl` text NOT NULL,
	`mediaType` enum('photo','video') NOT NULL,
	`likes` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `highlights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `match_players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`playerId` int NOT NULL,
	`teamId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `match_players_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `match_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`teamId` int NOT NULL,
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `match_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('public','friendly') NOT NULL,
	`status` enum('pending','confirmed','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`city` varchar(100) NOT NULL,
	`pitchName` varchar(255) NOT NULL,
	`matchDate` timestamp NOT NULL,
	`format` enum('5v5','8v8','11v11') NOT NULL,
	`maxPlayers` int NOT NULL,
	`teamAId` int NOT NULL,
	`teamBId` int,
	`scoreA` int,
	`scoreB` int,
	`createdBy` int NOT NULL,
	`ratingsOpen` boolean NOT NULL DEFAULT false,
	`ratingsClosedAt` timestamp,
	`motmVotingOpen` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `motm_votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`voterId` int NOT NULL,
	`votedPlayerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `motm_votes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`data` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`photoUrl` text,
	`city` varchar(100) NOT NULL,
	`country` varchar(100) NOT NULL,
	`countryFlag` varchar(10),
	`position` enum('GK','DEF','MID','ATT') NOT NULL,
	`teamId` int,
	`isFreeAgent` boolean NOT NULL DEFAULT true,
	`isCaptain` boolean NOT NULL DEFAULT false,
	`totalMatches` int NOT NULL DEFAULT 0,
	`totalPoints` int NOT NULL DEFAULT 0,
	`totalRatings` float NOT NULL DEFAULT 0,
	`ratingCount` int NOT NULL DEFAULT 0,
	`motmCount` int NOT NULL DEFAULT 0,
	`availableTime` varchar(255),
	`preferredFormat` varchar(20),
	`isAvailable` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `players_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`raterId` int NOT NULL,
	`ratedPlayerId` int NOT NULL,
	`score` float NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ratings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`logoUrl` text,
	`city` varchar(100) NOT NULL,
	`captainId` int NOT NULL,
	`totalWins` int NOT NULL DEFAULT 0,
	`totalMatches` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
