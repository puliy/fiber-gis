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
