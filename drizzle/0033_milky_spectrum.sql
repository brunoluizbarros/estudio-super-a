CREATE TABLE `historico_observacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventoId` int NOT NULL,
	`userId` int NOT NULL,
	`observacao` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historico_observacoes_id` PRIMARY KEY(`id`)
);
