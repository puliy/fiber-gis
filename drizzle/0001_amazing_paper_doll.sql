CREATE TABLE `audit_log` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`table_name` varchar(64) NOT NULL,
	`object_id` int NOT NULL,
	`operation` enum('INSERT','UPDATE','DELETE') NOT NULL,
	`user_id` int,
	`user_name` varchar(255),
	`old_data` json,
	`new_data` json,
	`changed_fields` json,
	`ip_address` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `buildings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`region_id` int NOT NULL,
	`name` varchar(255),
	`address` text,
	`osm_id` varchar(64),
	`polygon` json NOT NULL,
	`center_lat` decimal(10,7),
	`center_lng` decimal(10,7),
	`bbox_min_lat` decimal(10,7),
	`bbox_min_lng` decimal(10,7),
	`bbox_max_lat` decimal(10,7),
	`bbox_max_lng` decimal(10,7),
	`floors` int,
	`description` text,
	`attributes` json,
	`created_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `buildings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cable_ducts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`region_id` int NOT NULL,
	`name` varchar(255),
	`capacity` int DEFAULT 1,
	`diameter` int,
	`material` enum('plastic','concrete','metal','other') DEFAULT 'plastic',
	`route` json NOT NULL,
	`bbox_min_lat` decimal(10,7),
	`bbox_min_lng` decimal(10,7),
	`bbox_max_lat` decimal(10,7),
	`bbox_max_lng` decimal(10,7),
	`description` text,
	`created_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cable_ducts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cable_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`manufacturer` varchar(255),
	`fiber_count` int NOT NULL,
	`module_count` int DEFAULT 1,
	`fibers_per_module` int,
	`cable_type` enum('single_mode','multi_mode','armored','aerial','duct') DEFAULT 'single_mode',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cable_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`region_id` int NOT NULL,
	`template_id` int,
	`name` varchar(255),
	`status` enum('plan','fact','dismantled') NOT NULL DEFAULT 'fact',
	`laying_type` enum('aerial','underground','duct','building') DEFAULT 'aerial',
	`route` json NOT NULL,
	`length_calc` decimal(10,2),
	`length_fact` decimal(10,2),
	`bbox_min_lat` decimal(10,7),
	`bbox_min_lng` decimal(10,7),
	`bbox_max_lat` decimal(10,7),
	`bbox_max_lng` decimal(10,7),
	`start_point_id` int,
	`end_point_id` int,
	`description` text,
	`attributes` json,
	`is_public` boolean NOT NULL DEFAULT false,
	`created_by` int,
	`updated_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `map_points` (
	`id` int AUTO_INCREMENT NOT NULL,
	`region_id` int NOT NULL,
	`lat` decimal(10,7) NOT NULL,
	`lng` decimal(10,7) NOT NULL,
	`type` enum('pole','manhole','splice','mast','entry_point','node_district','node_trunk','flag','camera','other') NOT NULL,
	`status` enum('plan','fact','dismantled') NOT NULL DEFAULT 'fact',
	`name` varchar(255),
	`description` text,
	`address` text,
	`owner_id` int,
	`attributes` json,
	`is_public` boolean NOT NULL DEFAULT false,
	`created_by` int,
	`updated_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `map_points_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `public_map_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`region_id` int,
	`allowed_layers` json,
	`is_active` boolean NOT NULL DEFAULT true,
	`expires_at` timestamp,
	`created_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `public_map_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_map_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `regions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`center_lat` decimal(10,7) NOT NULL,
	`center_lng` decimal(10,7) NOT NULL,
	`default_zoom` int NOT NULL DEFAULT 13,
	`bbox_min_lat` decimal(10,7),
	`bbox_min_lng` decimal(10,7),
	`bbox_max_lat` decimal(10,7),
	`bbox_max_lng` decimal(10,7),
	`is_active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','viewer') NOT NULL DEFAULT 'user';