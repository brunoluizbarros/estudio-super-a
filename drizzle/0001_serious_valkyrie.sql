CREATE TABLE `agendamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventoId` int NOT NULL,
	`formandoId` int NOT NULL,
	`grupo` varchar(50),
	`dataAgendamento` datetime NOT NULL,
	`horaFormando` varchar(5),
	`horaChegadaFormando` varchar(5),
	`horaFamilia` varchar(5),
	`horaChegadaFamilia` varchar(5),
	`tamanhoBeca` enum('PPP','PP','P','M','G','GG','GGG'),
	`situacao` enum('aguardando','em_atendimento','concluido','ausente') DEFAULT 'aguardando',
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agendamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cenarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agendamentoId` int NOT NULL,
	`nomeCenario` varchar(100) NOT NULL,
	`nomeFotografo` varchar(100),
	`numeroArquivos` int DEFAULT 0,
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cenarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `configMaquiagem` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cidade` varchar(100) NOT NULL,
	`valorMasculino` int NOT NULL,
	`valorFeminino` int NOT NULL,
	`valorComissaoFamilia` int DEFAULT 3000,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `configMaquiagem_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eventos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`turmaId` int NOT NULL,
	`tipoEvento` enum('foto_estudio','foto_50','foto_descontrada','foto_oficial','foto_samu','foto_bloco','foto_consultorio') NOT NULL,
	`dataEvento` datetime NOT NULL,
	`local` varchar(255),
	`observacao` text,
	`status` enum('agendado','em_andamento','concluido','cancelado') DEFAULT 'agendado',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `formandos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`turmaId` int NOT NULL,
	`codigoFormando` varchar(50) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cpf` varchar(14),
	`telefone` varchar(20),
	`email` varchar(320),
	`genero` enum('masculino','feminino') DEFAULT 'masculino',
	`pacote` varchar(100),
	`eComissao` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formandos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itensVenda` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendaId` int NOT NULL,
	`produto` varchar(100) NOT NULL,
	`quantidade` int DEFAULT 1,
	`valorUnitario` int NOT NULL,
	`valorTotal` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itensVenda_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pagamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendaId` int NOT NULL,
	`tipo` enum('pix','dinheiro','debito','credito') NOT NULL,
	`valor` int NOT NULL,
	`valorLiquido` int,
	`bandeira` varchar(50),
	`parcelas` int DEFAULT 1,
	`dataCompensacao` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pagamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `produtos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`descricao` text,
	`preco` int NOT NULL,
	`ativo` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `produtos_id` PRIMARY KEY(`id`),
	CONSTRAINT `produtos_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `servicosAgendados` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agendamentoId` int NOT NULL,
	`tipoServico` enum('maquiagem_formando','maquiagem_familia','cabelo_simples','cabelo_combinado') NOT NULL,
	`realizado` boolean DEFAULT false,
	`valorPago` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `servicosAgendados_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taxasCartao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tipoPagamento` varchar(20) NOT NULL,
	`bandeira` varchar(50) NOT NULL,
	`parcelas` int NOT NULL DEFAULT 1,
	`taxaPercentual` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taxasCartao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `turmas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(50) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`curso` varchar(100),
	`instituicao` varchar(200),
	`cidade` varchar(100),
	`estado` varchar(2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `turmas_id` PRIMARY KEY(`id`),
	CONSTRAINT `turmas_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `vendas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agendamentoId` int NOT NULL,
	`formandoId` int NOT NULL,
	`dataVenda` datetime NOT NULL,
	`valorTotal` int NOT NULL,
	`valorLiquido` int,
	`status` enum('pendente','realizada','cancelada') DEFAULT 'pendente',
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','operador','coordenador') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('pendente','aprovado','rejeitado') DEFAULT 'pendente' NOT NULL;