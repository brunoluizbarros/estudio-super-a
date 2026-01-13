CREATE TABLE `tipos_usuario` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tipos_usuario_id` PRIMARY KEY(`id`),
	CONSTRAINT `tipos_usuario_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `tipoUsuarioId` int;