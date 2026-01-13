CREATE TABLE `usuario_turmas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`turmaId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `usuario_turmas_id` PRIMARY KEY(`id`)
);
