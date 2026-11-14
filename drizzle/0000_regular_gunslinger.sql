CREATE TABLE `interaction_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`interaction_id` integer NOT NULL,
	`author_id` integer NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`interaction_id`) REFERENCES `interactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `interaction_notes_interaction_idx` ON `interaction_notes` (`interaction_id`);--> statement-breakpoint
CREATE TABLE `interactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`author_id` integer NOT NULL,
	`prompt` text NOT NULL,
	`response` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`error_message` text,
	`model` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `interactions_created_idx` ON `interactions` (`created_at`);--> statement-breakpoint
CREATE TABLE `news_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_by` integer NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`category` text NOT NULL,
	`headline` text NOT NULL,
	`companies` text DEFAULT '' NOT NULL,
	`published_on` text,
	`source_name` text NOT NULL,
	`source_url` text NOT NULL,
	`source_text` text DEFAULT '' NOT NULL,
	`fact_summary` text DEFAULT '' NOT NULL,
	`why_it_matters` text DEFAULT '' NOT NULL,
	`ai_assisted` integer DEFAULT false NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `news_items_status_published_idx` ON `news_items` (`status`,`published_at`);--> statement-breakpoint
CREATE TABLE `reflections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`author_id` integer NOT NULL,
	`session_title` text NOT NULL,
	`session_date` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`raw_notes` text DEFAULT '' NOT NULL,
	`concepts` text DEFAULT '' NOT NULL,
	`takeaways` text DEFAULT '' NOT NULL,
	`observations` text DEFAULT '' NOT NULL,
	`insights` text DEFAULT '' NOT NULL,
	`open_questions` text DEFAULT '' NOT NULL,
	`ai_structured` integer DEFAULT false NOT NULL,
	`submitted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reflections_status_submitted_idx` ON `reflections` (`status`,`submitted_at`);--> statement-breakpoint
CREATE INDEX `reflections_author_idx` ON `reflections` (`author_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'MEMBER' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);