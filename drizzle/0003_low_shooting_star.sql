CREATE TABLE `anexos_despesas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`despesaId` int NOT NULL,
	`tipoAnexo` enum('comprovante_fiscal','documento') NOT NULL,
	`nomeArquivo` varchar(255) NOT NULL,
	`urlArquivo` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `anexos_despesas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cidades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`estado` varchar(2) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cidades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `configMaquiagemTurma` (
	`id` int AUTO_INCREMENT NOT NULL,
	`turmaId` int NOT NULL,
	`valorMasculino` int NOT NULL,
	`valorFeminino` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `configMaquiagemTurma_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cursos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cursos_id` PRIMARY KEY(`id`),
	CONSTRAINT `cursos_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `despesas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroCi` varchar(20) NOT NULL,
	`tipoDespesa` enum('operacional','administrativo') NOT NULL,
	`turmaId` int,
	`eventoId` int,
	`mesServico` varchar(7),
	`setorSolicitante` enum('estudio','fotografia') NOT NULL,
	`fornecedorId` int NOT NULL,
	`tipoServicoId` int,
	`detalhamento` text,
	`eReembolso` boolean DEFAULT false,
	`valorTotal` int NOT NULL,
	`tipoPagamento` enum('pix','transferencia','boleto','dinheiro','cartao'),
	`dadosPagamento` text,
	`tipoComprovante` enum('nota_fiscal','recibo','cupom','outros'),
	`dataLimitePagamento` datetime,
	`status` enum('pendente','apto','pendente_nf','cancelado') DEFAULT 'pendente',
	`pago` boolean DEFAULT false,
	`dataPagamento` datetime,
	`horarioSaida` varchar(5),
	`horarioRetorno` varchar(5),
	`cafeDaManhaIncluso` boolean DEFAULT false,
	`fornecedoresAlimentacao` text,
	`refeicoesCalculadas` text,
	`fornecedorHospedagem` int,
	`quartosHospedagem` text,
	`valoresDiarias` text,
	`diasAntes` int DEFAULT 0,
	`diasDepois` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `despesas_id` PRIMARY KEY(`id`),
	CONSTRAINT `despesas_numeroCi_unique` UNIQUE(`numeroCi`)
);
--> statement-breakpoint
CREATE TABLE `execucao_formando` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventoId` int NOT NULL,
	`formandoId` int NOT NULL,
	`arquivoEntregue` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `execucao_formando_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fornecedores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tipoPessoa` enum('PF','PJ'),
	`cpfCnpj` varchar(20),
	`nome` varchar(255) NOT NULL,
	`email` varchar(320),
	`telefone` varchar(20),
	`tiposServico` text,
	`cep` varchar(10),
	`logradouro` varchar(255),
	`bairro` varchar(100),
	`cidade` varchar(100),
	`estado` varchar(2),
	`banco` varchar(100),
	`agencia` varchar(20),
	`conta` varchar(30),
	`pix` varchar(255),
	`chavesPix` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fornecedores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fotos_formando` (
	`id` int AUTO_INCREMENT NOT NULL,
	`execucaoFormandoId` int NOT NULL,
	`cenarioId` int NOT NULL,
	`fotografoId` int,
	`numeroArquivos` int DEFAULT 0,
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fotos_formando_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `instituicoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(200) NOT NULL,
	`sigla` varchar(20),
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `instituicoes_id` PRIMARY KEY(`id`),
	CONSTRAINT `instituicoes_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `locais` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(200) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `locais_id` PRIMARY KEY(`id`),
	CONSTRAINT `locais_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `servicos_execucao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventoId` int NOT NULL,
	`formandoId` int NOT NULL,
	`tipoServico` enum('make_formando','make_familia','cabelo_simples','cabelo_combinado') NOT NULL,
	`fornecedorId` int,
	`quantidade` int NOT NULL DEFAULT 1,
	`valorUnitario` int DEFAULT 0,
	`valorTotal` int DEFAULT 0,
	`fluxo` enum('pagar','receber') NOT NULL,
	`dataRealizacao` timestamp,
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `servicos_execucao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tabela_preco_fornecedores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fornecedorId` int NOT NULL,
	`tipoServicoId` int NOT NULL,
	`tipoEventoId` int NOT NULL,
	`valor` int NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tabela_preco_fornecedores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tipos_cenario` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tipos_cenario_id` PRIMARY KEY(`id`),
	CONSTRAINT `tipos_cenario_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `tipos_evento` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`codigo` varchar(50) NOT NULL,
	`cor` varchar(20) DEFAULT '#3b82f6',
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tipos_evento_id` PRIMARY KEY(`id`),
	CONSTRAINT `tipos_evento_nome_unique` UNIQUE(`nome`),
	CONSTRAINT `tipos_evento_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `tipos_servico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tipos_servico_id` PRIMARY KEY(`id`),
	CONSTRAINT `tipos_servico_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
ALTER TABLE `eventos` MODIFY COLUMN `dataEvento` datetime;--> statement-breakpoint
ALTER TABLE `vendas` MODIFY COLUMN `agendamentoId` int;--> statement-breakpoint
ALTER TABLE `vendas` MODIFY COLUMN `status` enum('pendente','pago','cancelada') DEFAULT 'pendente';--> statement-breakpoint
ALTER TABLE `eventos` ADD `dataEventoFim` datetime;--> statement-breakpoint
ALTER TABLE `eventos` ADD `cenarios` text;--> statement-breakpoint
ALTER TABLE `formandos` ADD `status` enum('apto','inapto','migracao') DEFAULT 'apto';--> statement-breakpoint
ALTER TABLE `formandos` ADD `tamanhoBeca` varchar(10);--> statement-breakpoint
ALTER TABLE `formandos` ADD `maquiagem` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `itensVenda` ADD `produtoId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `itensVenda` ADD `categoria` varchar(50);--> statement-breakpoint
ALTER TABLE `turmas` ADD `cursos` text NOT NULL;--> statement-breakpoint
ALTER TABLE `turmas` ADD `instituicoes` text NOT NULL;--> statement-breakpoint
ALTER TABLE `turmas` ADD `anos` text NOT NULL;--> statement-breakpoint
ALTER TABLE `turmas` ADD `periodos` text NOT NULL;--> statement-breakpoint
ALTER TABLE `turmas` ADD `fotosInclusas` enum('todas','30','20','10');--> statement-breakpoint
ALTER TABLE `turmas` ADD `observacao` text;--> statement-breakpoint
ALTER TABLE `turmas` ADD `valorMakeFormandoMasc` int;--> statement-breakpoint
ALTER TABLE `turmas` ADD `valorMakeFormandoFem` int;--> statement-breakpoint
ALTER TABLE `turmas` ADD `valorMakeFamilia` int;--> statement-breakpoint
ALTER TABLE `turmas` ADD `valorCabeloSimples` int;--> statement-breakpoint
ALTER TABLE `turmas` ADD `valorCabeloCombinado` int;--> statement-breakpoint
ALTER TABLE `vendas` ADD `eventoId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `turmas` DROP COLUMN `curso`;--> statement-breakpoint
ALTER TABLE `turmas` DROP COLUMN `instituicao`;--> statement-breakpoint
ALTER TABLE `turmas` DROP COLUMN `ano`;--> statement-breakpoint
ALTER TABLE `turmas` DROP COLUMN `periodo`;