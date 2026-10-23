CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`organization_id` text,
	`lead_id` text,
	`deal_id` text,
	`event_id` text,
	`due_date` text,
	`type` text DEFAULT 'Note',
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`event_id` text NOT NULL,
	`inventory_id` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inventory_id`) REFERENCES `inventory`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`type` text
);
--> statement-breakpoint
CREATE TABLE `automation_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`rule_id` text,
	`dedupe` text NOT NULL,
	FOREIGN KEY (`rule_id`) REFERENCES `automations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `automation_dedupe` ON `automation_logs` (`workspace`,`dedupe`);--> statement-breakpoint
CREATE TABLE `automations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`type` text,
	`days` integer DEFAULT 3
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`city` text
);
--> statement-breakpoint
CREATE TABLE `checklists` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`event_id` text,
	`due_date` text,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`organization_id` text,
	`email` text,
	`phone` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `deals` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`organization_id` text,
	`contact_id` text,
	`lead_id` text,
	`value` real DEFAULT 0,
	`probability` real DEFAULT 20,
	`due_date` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `deal_workspace_status` ON `deals` (`workspace`,`status`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`organization_id` text,
	`lead_id` text,
	`deal_id` text,
	`event_id` text,
	`key` text NOT NULL,
	`mime` text,
	`size` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`organization_id` text,
	`deal_id` text,
	`due_date` text,
	`end_date` text,
	`venue` text,
	`value` real DEFAULT 0,
	`budget` real DEFAULT 0,
	`participants` integer DEFAULT 0,
	`type` text DEFAULT 'Chess Tournament',
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `event_date` ON `events` (`workspace`,`due_date`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`event_id` text,
	`value` real NOT NULL,
	`due_date` text,
	`type` text DEFAULT 'Other',
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`type` text,
	`value` real DEFAULT 0,
	`due_date` text
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`type` text DEFAULT 'Chess Sets',
	`quantity` integer DEFAULT 0 NOT NULL,
	`value` real DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`organization_id` text,
	`contact_id` text,
	`email` text,
	`phone` text,
	`city` text,
	`type` text DEFAULT 'Private School',
	`priority` text DEFAULT 'Medium',
	`source` text,
	`value` real DEFAULT 0,
	`due_date` text,
	`last_contact` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lead_workspace_status` ON `leads` (`workspace`,`status`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`due_date` text
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`type` text DEFAULT 'Private School',
	`city` text,
	`email` text,
	`phone` text
);
--> statement-breakpoint
CREATE INDEX `org_workspace` ON `organizations` (`workspace`);--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`event_id` text,
	`organization_id` text,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`event_id` text NOT NULL,
	`value` real NOT NULL,
	`due_date` text,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`organization_id` text,
	`deal_id` text,
	`due_date` text,
	`value` real DEFAULT 0,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quotation_items` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`proposal_id` text NOT NULL,
	`quantity` real DEFAULT 1,
	`value` real DEFAULT 0,
	FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stages` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`probability` real DEFAULT 0,
	`position` integer DEFAULT 0,
	`color` text
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`organization_id` text,
	`lead_id` text,
	`deal_id` text,
	`event_id` text,
	`due_date` text,
	`priority` text DEFAULT 'Medium',
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'Owner' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_workspace_email` ON `users` (`workspace`,`email`);