CREATE TABLE `permissoes_configuracoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` enum('administrador','gestor','coordenador','cerimonial','beca','logistica','armazenamento','financeiro') NOT NULL,
	`aba` enum('instituicoes','cursos','cidades','locais','tipos_evento','tipos_servico','fornecedores','tabela_preco','taxas_cartao','produtos','maquiagem') NOT NULL,
	`visualizar` boolean NOT NULL DEFAULT false,
	`inserir` boolean NOT NULL DEFAULT false,
	`excluir` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `permissoes_configuracoes_id` PRIMARY KEY(`id`)
);
