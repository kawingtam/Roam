CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`trip` text NOT NULL,
	`user` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`date` text NOT NULL,
	`receipt` text,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` text PRIMARY KEY NOT NULL,
	`trip` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`trip` text NOT NULL,
	`user` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`destination` text NOT NULL,
	`currency` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`created` integer NOT NULL
);
