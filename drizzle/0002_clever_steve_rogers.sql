CREATE TABLE `cable_fibers` (
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
