CREATE TABLE `fechamento_diario` (
	`id` int AUTO_INCREMENT NOT NULL,
	`data` date NOT NULL,
	`turmaId` int,
	`eventoId` int,
	`usuarioId` int NOT NULL,
	`status` enum('em_andamento','concluido','cancelado') NOT NULL DEFAULT 'em_andamento',
	`totalTransacoesMaquineta` decimal(10,2) NOT NULL DEFAULT '0',
	`totalVendasSistema` decimal(10,2) NOT NULL DEFAULT '0',
	`totalDivergencias` int NOT NULL DEFAULT 0,
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fechamento_diario_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transacoes_maquineta` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fechamentoId` int NOT NULL,
	`cv` varchar(50) NOT NULL,
	`data` date NOT NULL,
	`hora` time NOT NULL,
	`valor` decimal(10,2) NOT NULL,
	`tipo` enum('debito','credito_vista','credito_parcelado','pix') NOT NULL,
	`bandeira` varchar(50),
	`parcelas` int NOT NULL DEFAULT 1,
	`valorParcela` decimal(10,2),
	`maquineta` enum('pagbank','itau') NOT NULL,
	`imagemUrl` varchar(500),
	`statusConciliacao` enum('pendente','ok','divergencia_valor','nao_lancado') NOT NULL DEFAULT 'pendente',
	`vendaId` int,
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transacoes_maquineta_id` PRIMARY KEY(`id`)
);
