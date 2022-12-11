CREATE TABLE `Settings` (
	`user` varchar(255) NOT NULL,
	`data` text,
	`updated_at` TIMESTAMP,
	PRIMARY KEY (`user`)
);

CREATE TABLE `EventList` (
	`user` varchar(255) NOT NULL,
	`list` mediumtext,
	`updated_at` TIMESTAMP,
	PRIMARY KEY (`user`)
);

CREATE TABLE `EventDetail` (
	`user` varchar(255) NOT NULL,
	`id` varchar(255) NOT NULL,
	`detail` mediumtext,
	`updated_at` TIMESTAMP,
	PRIMARY KEY (`user`, `id`)
);

CREATE TABLE `EventDescription` (
	`user` varchar(255) NOT NULL,
	`id` varchar(255) NOT NULL,
	`description` mediumtext,
	`updated_at` TIMESTAMP,
	PRIMARY KEY (`user`, `id`)
);
