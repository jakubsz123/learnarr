CREATE TABLE `suggestions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`subtitle_id` integer NOT NULL,
	`language` text NOT NULL,
	`term` text NOT NULL,
	`form` text NOT NULL,
	`translation` text NOT NULL,
	`part_of_speech` text,
	`note` text,
	`sentence` text NOT NULL,
	`sentence_start_ms` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subtitle_id`) REFERENCES `subtitles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suggestions_user_lang_term_idx` ON `suggestions` (`user_id`,`language`,`term`);