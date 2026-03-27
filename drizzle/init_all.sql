CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
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
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','viewer') NOT NULL DEFAULT 'user';CREATE TABLE `cable_fibers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`module_id` int NOT NULL,
	`fiber_number` int NOT NULL,
	`color_id` int,
	`fiber_type` enum('G.652D','G.657A1','G.657A2','OM3','OM4') DEFAULT 'G.652D',
	`description` varchar(255),
	CONSTRAINT `cable_fibers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cable_modules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_id` int NOT NULL,
	`module_number` int NOT NULL,
	`color_id` int,
	`fiber_count` int NOT NULL,
	`description` varchar(255),
	CONSTRAINT `cable_modules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fiber_colors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`hex_code` varchar(7) NOT NULL,
	`iec_number` int,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `fiber_colors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fiber_splices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`closure_id` int NOT NULL,
	`cable_a_id` int,
	`module_a_number` int,
	`fiber_a_number` int,
	`cable_b_id` int,
	`module_b_number` int,
	`fiber_b_number` int,
	`splice_type` enum('fusion','mechanical') DEFAULT 'fusion',
	`loss` decimal(5,3),
	`notes` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fiber_splices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `splice_closures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`map_point_id` int NOT NULL,
	`name` varchar(255),
	`closure_type` enum('inline','branch','terminal') DEFAULT 'inline',
	`capacity` int DEFAULT 24,
	`manufacturer` varchar(255),
	`model` varchar(255),
	`install_date` timestamp,
	`description` text,
	`created_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `splice_closures_id` PRIMARY KEY(`id`)
);
CREATE TABLE `cross_ports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cross_id` int NOT NULL,
	`port_number` int NOT NULL,
	`port_side` enum('line','subscriber') DEFAULT 'line',
	`cable_id` int,
	`module_number` int,
	`fiber_number` int,
	`color_id` int,
	`status` enum('free','used','reserved','faulty') DEFAULT 'free',
	`notes` varchar(255),
	CONSTRAINT `cross_ports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `optical_crosses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`map_point_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`cross_type` enum('ODF','ШКОС','МОКС','other') DEFAULT 'ODF',
	`port_count` int NOT NULL DEFAULT 24,
	`manufacturer` varchar(255),
	`model` varchar(255),
	`description` text,
	`created_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `optical_crosses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `port_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cross_id` int NOT NULL,
	`port_a_id` int NOT NULL,
	`port_b_id` int NOT NULL,
	`connector_type` enum('SC','LC','FC','ST','E2000') DEFAULT 'SC',
	`loss` decimal(5,3),
	`notes` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `port_connections_id` PRIMARY KEY(`id`)
);
CREATE TABLE `active_equipment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`region_id` int NOT NULL,
	`map_point_id` int,
	`name` varchar(255) NOT NULL,
	`equip_type` enum('OLT','switch','media_converter','ONT','splitter','amplifier','other') NOT NULL DEFAULT 'other',
	`vendor` varchar(100),
	`model` varchar(100),
	`serial_number` varchar(100),
	`ip_address` varchar(45),
	`port_count` int,
	`status` enum('active','inactive','planned','faulty') DEFAULT 'planned',
	`notes` text,
	`created_by` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `active_equipment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equip_ports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equip_id` int NOT NULL,
	`port_name` varchar(50) NOT NULL,
	`port_type` enum('PON','GE','FE','SFP','GPON','XGPON','other') DEFAULT 'other',
	`cable_id` int,
	`module_number` int,
	`fiber_number` int,
	`status` enum('free','used','reserved','faulty') DEFAULT 'free',
	`notes` varchar(255),
	CONSTRAINT `equip_ports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `splitters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`region_id` int NOT NULL,
	`map_point_id` int,
	`cross_id` int,
	`name` varchar(255) NOT NULL,
	`split_ratio` enum('1:2','1:4','1:8','1:16','1:32','1:64','1:128') NOT NULL DEFAULT '1:8',
	`input_cable_id` int,
	`input_module` int,
	`input_fiber` int,
	`status` enum('active','inactive','planned','faulty') DEFAULT 'planned',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `splitters_id` PRIMARY KEY(`id`)
);
ALTER TABLE `users` ADD `passwordHash` varchar(255);