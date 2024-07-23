CREATE TABLE IF NOT EXISTS `Settings` (
	`user` varchar(255) NOT NULL,
	`data` text,
	`updated_at` TIMESTAMP,
	PRIMARY KEY (`user`)
);

CREATE TABLE IF NOT EXISTS `EventList` (
	`user` varchar(255) NOT NULL,
	`list` mediumtext,
	`updated_at` TIMESTAMP,
	PRIMARY KEY (`user`)
);

CREATE TABLE IF NOT EXISTS `EventDetail` (
	`user` varchar(255) NOT NULL,
	`id` varchar(255) NOT NULL,
	`detail` mediumtext,
	`updated_at` TIMESTAMP,
	PRIMARY KEY (`user`, `id`)
);

CREATE TABLE IF NOT EXISTS `EventDescription` (
	`user` varchar(255) NOT NULL,
	`id` varchar(255) NOT NULL,
	`description` mediumtext,
	`updated_at` TIMESTAMP,
	PRIMARY KEY (`user`, `id`)
);

CREATE TABLE IF NOT EXISTS `Photo` (
  `user` varchar(255) NOT NULL,
	`eventId` varchar(255) NOT NULL,
	`id` varchar(255) NOT NULL,
	`name` tinytext,
	`thumbnail` mediumblob,
	`photo` longblob,
	`updated_at` TIMESTAMP,
	PRIMARY KEY (`user`, `id`)
);

CREATE TABLE IF NOT EXISTS `QNATemplate` (
  `user` varchar(255) NOT NULL,
	`eventId` varchar(255) NOT NULL,
	`id` varchar(255) NOT NULL,
	`question` text,
	`answer` mediumtext,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP,
	PRIMARY KEY (`user`, `eventId`, `id`)
);

CREATE TABLE IF NOT EXISTS `QNAStatus` (
  `user` varchar(255) NOT NULL,
  `eventId` varchar(255) NOT NULL,
	`id` varchar(255) NOT NULL,
	`status` tinytext,
	`updated_at` TIMESTAMP,
	PRIMARY KEY (`user`, `eventId`, `id`)
);

CREATE TABLE IF NOT EXISTS `calendarevent` (
	`user` text NOT NULL,
	`id` text NOT NULL,
	`masterid` text,
	`start` date NOT NULL,
	`details` JSON,
	PRIMARY KEY (`user`, `id`, `start`)
);
