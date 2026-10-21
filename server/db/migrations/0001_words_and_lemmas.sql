CREATE TABLE `known_words` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`language` text NOT NULL,
	`word` text NOT NULL,
	`source` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `known_words_user_lang_word_idx` ON `known_words` (`user_id`,`language`,`word`);--> statement-breakpoint
CREATE TABLE `subtitle_lemmas` (
	`subtitle_id` integer PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`tokens` text,
	`model` text,
	`message` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`subtitle_id`) REFERENCES `subtitles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `word_seeds` (
	`user_id` text NOT NULL,
	`language` text NOT NULL,
	`level` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `language`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
