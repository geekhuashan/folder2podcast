CREATE TABLE `episodes` (
	`id` text PRIMARY KEY NOT NULL,
	`podcast_id` text NOT NULL,
	`file_name` text NOT NULL,
	`file_size` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`pub_date` integer NOT NULL,
	`duration` real,
	`cover_file_name` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`podcast_id`) REFERENCES `podcasts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `episodes_podcast_id_idx` ON `episodes` (`podcast_id`);--> statement-breakpoint
CREATE TABLE `podcasts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`dir_name` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '',
	`author` text DEFAULT '',
	`email` text DEFAULT '',
	`website_url` text DEFAULT '',
	`language` text DEFAULT 'zh-cn',
	`category` text DEFAULT 'Technology',
	`explicit` integer DEFAULT false,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `podcasts_user_id_idx` ON `podcasts` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`access_key` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_access_key_unique` ON `users` (`access_key`);--> statement-breakpoint
CREATE INDEX `users_access_key_idx` ON `users` (`access_key`);