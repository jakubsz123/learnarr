ALTER TABLE `user` ADD `onboarded_at` integer;--> statement-breakpoint
-- People who had accounts before this question existed already chose their languages.
UPDATE `user` SET `onboarded_at` = `created_at`;
