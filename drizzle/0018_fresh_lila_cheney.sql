CREATE TABLE `despesas_v2` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroCi` varchar(20) NOT NULL,
	`tipoDespesa` enum('operacional','administrativa') NOT NULL,
	`mesServico` enum('janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro') NOT NULL,
	`setorSolicitante` enum('estudio','fotografia') NOT NULL,
	`fornecedorId` int NOT NULL,
	`tipoServicoCompra` varchar(255),
	`detalhamento` text NOT NULL,
	`eReembolso` boolean NOT NULL DEFAULT false,
	`valorTotal` int NOT NULL,
	`tipoPagamento` enum('pix','cartao','boleto','dinheiro') NOT NULL,
	`dadosPagamento` text NOT NULL,
	`tipoComprovanteFiscal` enum('contrato','nota_fiscal','rpa'),
	`dataLimitePagamento` datetime,
	`local` varchar(255),
	`status` enum('aguardando_aprovacao_gestor','aguardando_aprovacao_gestor_geral','aprovado_gestor','aprovado_gestor_geral','liquidado') NOT NULL DEFAULT 'aguardando_aprovacao_gestor',
	`dataLiquidacao` datetime,
	`comprovanteUrl` varchar(500),
	`criadoPorId` int NOT NULL,
	`criadoPorNome` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `despesas_v2_id` PRIMARY KEY(`id`),
	CONSTRAINT `despesas_v2_numeroCi_unique` UNIQUE(`numeroCi`)
);
--> statement-breakpoint
CREATE TABLE `despesas_v2_anexos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`despesaId` int NOT NULL,
	`tipoAnexo` enum('comprovante_fiscal','documento','comprovante_liquidacao') NOT NULL,
	`nomeArquivo` varchar(255) NOT NULL,
	`urlArquivo` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `despesas_v2_anexos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `despesas_v2_datas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`despesaId` int NOT NULL,
	`dataRealizacao` datetime NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `despesas_v2_datas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `despesas_v2_historico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`despesaId` int NOT NULL,
	`acao` enum('criacao','aprovacao_gestor','rejeicao_gestor','aprovacao_gestor_geral','rejeicao_gestor_geral','edicao','liquidacao') NOT NULL,
	`statusAnterior` varchar(50),
	`statusNovo` varchar(50),
	`justificativa` text,
	`usuarioId` int NOT NULL,
	`usuarioNome` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `despesas_v2_historico_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `despesas_v2_turmas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`despesaId` int NOT NULL,
	`turmaId` int NOT NULL,
	`tipoEvento` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `despesas_v2_turmas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sequencia_ci` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ano` int NOT NULL,
	`ultimoNumero` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sequencia_ci_id` PRIMARY KEY(`id`),
	CONSTRAINT `sequencia_ci_ano_unique` UNIQUE(`ano`)
);
