ALTER TABLE `categories` ADD `icon` text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `aliases` text DEFAULT '[]' NOT NULL;