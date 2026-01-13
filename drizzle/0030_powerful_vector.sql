CREATE TABLE `permissoes_relatorios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` enum('administrador','gestor','coordenador','cerimonial','beca','logistica','armazenamento','financeiro') NOT NULL,
	`aba` enum('despesas','emissao_nf','servicos_make_cabelo','execucao') NOT NULL,
	`visualizar` boolean NOT NULL DEFAULT false,
	`inserir` boolean NOT NULL DEFAULT false,
	`excluir` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `permissoes_relatorios_id` PRIMARY KEY(`id`)
);
