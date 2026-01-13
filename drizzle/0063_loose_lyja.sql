CREATE TABLE `historico_alteracoes_vendas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendaId` int NOT NULL,
	`tipo` enum('exclusao','edicao') NOT NULL,
	`usuarioId` int NOT NULL,
	`dataAlteracao` timestamp NOT NULL DEFAULT (now()),
	`motivo` text,
	`camposAlterados` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historico_alteracoes_vendas_id` PRIMARY KEY(`id`)
);
