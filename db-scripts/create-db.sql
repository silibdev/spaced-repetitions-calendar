CREATE TABLE `Settings` (
	`user` varchar(255) NOT NULL,
	`data` text,
	PRIMARY KEY (`user`)
);

CREATE TABLE `EventList` (
	`user` varchar(255) NOT NULL,
	`list` mediumtext,
	PRIMARY KEY (`user`)
);

CREATE TABLE `EventDetail` (
	`user` varchar(255) NOT NULL,
	`id` varchar(255) NOT NULL,
	`detail` mediumtext,
	PRIMARY KEY (`user`, `id`)
);

CREATE TABLE `EventDescription` (
	`user` varchar(255) NOT NULL,
	`id` varchar(255) NOT NULL,
	`description` mediumtext,
	PRIMARY KEY (`user`, `id`)
);
