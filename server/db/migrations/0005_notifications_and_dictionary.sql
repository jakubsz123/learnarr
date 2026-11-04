CREATE TABLE `dictionary_entries` (
	`language` text NOT NULL,
	`word` text NOT NULL,
	`entries` text,
	`fetched_at` integer NOT NULL,
	PRIMARY KEY(`language`, `word`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_idx` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
ALTER TABLE `user` ADD `locale` text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `ntfy_topic` text;--> statement-breakpoint
ALTER TABLE `user` ADD `practice_reminders` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `watch_reminders` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `media_server_user` text;--> statement-breakpoint
ALTER TABLE `user` ADD `last_reminded_at` integer;