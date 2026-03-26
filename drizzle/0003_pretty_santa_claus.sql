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
