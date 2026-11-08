CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`trip` text NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`creator` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_key_unique` ON `categories` (`key`);--> statement-breakpoint
ALTER TABLE `expenses` ADD `authorName` text;