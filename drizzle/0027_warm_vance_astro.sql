CREATE TABLE `permissoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` enum('administrador','gestor','coordenador','cerimonial','beca','logistica','armazenamento') NOT NULL,
	`secao` varchar(50) NOT NULL,
	`visualizar` boolean NOT NULL DEFAULT false,
	`inserir` boolean NOT NULL DEFAULT false,
	`excluir` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `permissoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('administrador','gestor','coordenador','cerimonial','beca','logistica','armazenamento') NOT NULL DEFAULT 'coordenador';