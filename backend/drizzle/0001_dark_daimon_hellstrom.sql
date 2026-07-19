CREATE TABLE `character_xp_log` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text NOT NULL,
	`amount` integer NOT NULL,
	`reason` text,
	`created_at` integer,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`config` text,
	`created_at` integer,
	`updated_at` integer
);
