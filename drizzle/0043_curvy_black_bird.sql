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
CREATE TABLE `briefing_evento` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventoId` int NOT NULL,
	`formandoId` int NOT NULL,
	`grupo` int DEFAULT 1,
	`horarioFormando` varchar(20),
	`horarioFamilia` varchar(20),
	`makeFormando` boolean DEFAULT false,
	`cabeloFormando` boolean DEFAULT false,
	`makeFamilia` int DEFAULT 0,
	`cabeloFamilia` int DEFAULT 0,
	`qtdFamilia` int DEFAULT 0,
	`qtdPets` int DEFAULT 0,
	`somenteGrupo` boolean DEFAULT false,
	`observacao` text,
	`preenchidoPor` varchar(100),
	`preenchidoEm` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `briefing_evento_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `briefing_formando` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grupoId` int NOT NULL,
	`eventoId` int NOT NULL,
	`formandoId` int NOT NULL,
	`ordem` int DEFAULT 1,
	`horarioFamiliaSemServico` varchar(20),
	`horarioFamiliaComServico` varchar(20),
	`makeFormando` boolean DEFAULT false,
	`cabeloFormando` boolean DEFAULT false,
	`makeFamilia` boolean DEFAULT false,
	`cabeloFamilia` boolean DEFAULT false,
	`qtdMakeFamilia` int DEFAULT 0,
	`qtdCabeloFamilia` int DEFAULT 0,
	`qtdFamilia` int DEFAULT 0,
	`qtdPets` int DEFAULT 0,
	`peso` varchar(10),
	`altura` varchar(10),
	`somenteGrupo` boolean DEFAULT false,
	`observacao` text,
	`preenchidoPor` varchar(100),
	`preenchidoEm` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `briefing_formando_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `briefing_grupo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventoId` int NOT NULL,
	`numero` int NOT NULL,
	`dataGrupo` timestamp,
	`horarioFormandos` varchar(20),
	`limiteFormandos` int DEFAULT 10,
	`ativo` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `briefing_grupo_id` PRIMARY KEY(`id`)
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
	`setorSolicitante` enum('estudio','fotografia','becas') NOT NULL,
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
CREATE TABLE `despesas_v2` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroCi` varchar(20) NOT NULL,
	`tipoDespesa` enum('operacional','administrativa') NOT NULL,
	`mesServico` enum('janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro') NOT NULL,
	`setorSolicitante` enum('estudio','fotografia','becas') NOT NULL,
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
CREATE TABLE `eventos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`turmaId` int NOT NULL,
	`tipoEvento` enum('foto_estudio','foto_50','foto_descontrada','foto_oficial','foto_samu','foto_bloco','foto_consultorio') NOT NULL,
	`dataEvento` datetime,
	`dataEventoFim` datetime,
	`local` varchar(255),
	`cenarios` text,
	`fotografos` text,
	`cerimoniais` text,
	`coordenadores` text,
	`producao` text,
	`maquiadoras` text,
	`observacao` text,
	`status` enum('agendado','em_andamento','concluido','cancelado') DEFAULT 'agendado',
	`acessoComissaoHabilitado` boolean NOT NULL DEFAULT false,
	`prazoEdicaoComissao` datetime,
	`tokenAcessoComissao` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventos_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventos_tokenAcessoComissao_unique` UNIQUE(`tokenAcessoComissao`)
);
--> statement-breakpoint
CREATE TABLE `execucao_formando` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventoId` int NOT NULL,
	`formandoId` int NOT NULL,
	`status` enum('apto','inapto','migracao') DEFAULT 'apto',
	`arquivoEntregue` boolean DEFAULT false,
	`dataExecucao` timestamp,
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `execucao_formando_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `extratos_uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fechamentoId` int NOT NULL,
	`tipo` enum('itau_entrada','itau_saida','rede_recebimentos') NOT NULL,
	`nomeArquivo` varchar(255) NOT NULL,
	`urlArquivo` text NOT NULL,
	`processado` boolean NOT NULL DEFAULT false,
	`dadosProcessados` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `extratos_uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fechamentos_mensais` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mes` int NOT NULL,
	`ano` int NOT NULL,
	`tipo` enum('vendas','conta_bancaria') NOT NULL,
	`receitaCartoes` decimal(15,2) NOT NULL DEFAULT '0',
	`receitaPix` decimal(15,2) NOT NULL DEFAULT '0',
	`receitaDinheiro` decimal(15,2) NOT NULL DEFAULT '0',
	`receitaRendimento` decimal(15,2) NOT NULL DEFAULT '0',
	`receitaPlataforma` decimal(15,2) NOT NULL DEFAULT '0',
	`receitaPagseguro` decimal(15,2) NOT NULL DEFAULT '0',
	`receitaSantander` decimal(15,2) NOT NULL DEFAULT '0',
	`despesaTarifaCartao` decimal(15,2) NOT NULL DEFAULT '0',
	`despesaOutrasTarifas` decimal(15,2) NOT NULL DEFAULT '0',
	`despesaImpostos` decimal(15,2) NOT NULL DEFAULT '0',
	`despesaMaquiadora` decimal(15,2) NOT NULL DEFAULT '0',
	`despesaOperacaoFora` decimal(15,2) NOT NULL DEFAULT '0',
	`despesaInvestimentos` decimal(15,2) NOT NULL DEFAULT '0',
	`despesaEstorno` decimal(15,2) NOT NULL DEFAULT '0',
	`despesaTransfSantander` decimal(15,2) NOT NULL DEFAULT '0',
	`impostosIss` decimal(15,2) NOT NULL DEFAULT '0',
	`impostosPis` decimal(15,2) NOT NULL DEFAULT '0',
	`impostosCofins` decimal(15,2) NOT NULL DEFAULT '0',
	`impostosCsll` decimal(15,2) NOT NULL DEFAULT '0',
	`impostosIrpj` decimal(15,2) NOT NULL DEFAULT '0',
	`aliquotaIrpjEstimada` decimal(5,2) NOT NULL DEFAULT '0',
	`aliquotaIrpjReal` decimal(5,2) NOT NULL DEFAULT '0',
	`criadoPorId` int NOT NULL,
	`criadoPorNome` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fechamentos_mensais_id` PRIMARY KEY(`id`)
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
	`status` enum('apto','inapto','migracao') DEFAULT 'apto',
	`eComissao` boolean DEFAULT false,
	`tamanhoBeca` varchar(10),
	`becaEvento` varchar(10),
	`maquiagem` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formandos_id` PRIMARY KEY(`id`)
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
	`execucaoFormandoId` int,
	`briefingFormandoId` int,
	`cenarioId` int NOT NULL,
	`fotografoId` int,
	`horarioInicio` varchar(10),
	`horarioTermino` varchar(10),
	`numeroArquivos` int DEFAULT 0,
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fotos_formando_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historico_observacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventoId` int NOT NULL,
	`userId` int NOT NULL,
	`observacao` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historico_observacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `horarios_briefing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventoId` int NOT NULL,
	`grupo` int NOT NULL,
	`horarioFormando` varchar(20) NOT NULL,
	`horarioFamilia` varchar(20) NOT NULL,
	`capacidade` int DEFAULT 10,
	`ativo` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `horarios_briefing_id` PRIMARY KEY(`id`)
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
CREATE TABLE `itensVenda` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendaId` int NOT NULL,
	`produtoId` int NOT NULL,
	`produto` varchar(100) NOT NULL,
	`categoria` varchar(50),
	`quantidade` int DEFAULT 1,
	`valorUnitario` int NOT NULL,
	`ajusteValor` int DEFAULT 0,
	`justificativa` varchar(255),
	`valorTotal` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itensVenda_id` PRIMARY KEY(`id`)
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
CREATE TABLE `notificacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tipo` enum('despesa_criada','despesa_aprovada_gestor','despesa_aprovada_gestor_geral','despesa_rejeitada_gestor','despesa_rejeitada_gestor_geral','despesa_liquidada','turma_criada','evento_criado','evento_editado','evento_excluido','venda_editada','venda_excluida','lembrete_evento_5dias','lembrete_evento_2dias') NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`mensagem` text NOT NULL,
	`despesaId` int,
	`turmaId` int,
	`eventoId` int,
	`vendaId` int,
	`lida` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notificacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pagamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendaId` int NOT NULL,
	`tipo` enum('pix','dinheiro','debito','credito','incluso_pacote') NOT NULL,
	`valor` int NOT NULL,
	`valorLiquido` int,
	`bandeira` varchar(50),
	`parcelas` int DEFAULT 1,
	`cvNsu` varchar(50),
	`dataCompensacao` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pagamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permissoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` enum('administrador','gestor','coordenador','cerimonial','beca','logistica','armazenamento','financeiro') NOT NULL,
	`secao` varchar(50) NOT NULL,
	`visualizar` boolean NOT NULL DEFAULT false,
	`inserir` boolean NOT NULL DEFAULT false,
	`excluir` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `permissoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `permissoes_relatorios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` enum('administrador','gestor','coordenador','cerimonial','beca','logistica','armazenamento','financeiro') NOT NULL,
	`aba` enum('despesas','emissao_nf','servicos_make_cabelo','execucao','compensacao_bancaria','observacoes','fechamentos_mensais') NOT NULL,
	`visualizar` boolean NOT NULL DEFAULT false,
	`inserir` boolean NOT NULL DEFAULT false,
	`excluir` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `permissoes_relatorios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `produtos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`descricao` text,
	`preco` int NOT NULL,
	`categoria` enum('Foto','Cabelo','Outros') DEFAULT 'Outros',
	`ativo` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `produtos_id` PRIMARY KEY(`id`),
	CONSTRAINT `produtos_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `reunioes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`turmaId` int NOT NULL,
	`data` date NOT NULL,
	`horario` varchar(5) NOT NULL,
	`tiposEvento` text NOT NULL,
	`tipoReuniao` enum('Presencial','Online') NOT NULL,
	`quantidadeReunioes` int DEFAULT 0,
	`dataResumo` date,
	`alinhamento` boolean DEFAULT false,
	`dataBriefing` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reunioes_id` PRIMARY KEY(`id`)
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
	`tipoMake` enum('masc','fem'),
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
CREATE TABLE `turmas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(50) NOT NULL,
	`cursos` text NOT NULL,
	`instituicoes` text NOT NULL,
	`numeroTurma` varchar(20),
	`anos` text NOT NULL,
	`periodos` text NOT NULL,
	`cidade` varchar(100) NOT NULL,
	`estado` varchar(2) NOT NULL,
	`fotosInclusas` enum('todas','30','20','10'),
	`observacao` text,
	`observacoesBeca` text,
	`valorMakeFormandoMasc` int,
	`valorMakeFormandoFem` int,
	`valorMakeFamilia` int,
	`valorCabeloSimples` int,
	`valorCabeloCombinado` int,
	`valorRetoque` int,
	`pacotesConfig` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `turmas_id` PRIMARY KEY(`id`),
	CONSTRAINT `turmas_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `vendas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agendamentoId` int,
	`reuniaoId` int,
	`eventoId` int NOT NULL,
	`formandoId` int NOT NULL,
	`dataVenda` datetime NOT NULL,
	`valorTotal` int NOT NULL,
	`valorLiquido` int,
	`status` enum('pendente','pago','cancelada') DEFAULT 'pendente',
	`fase` enum('Atendimento','Execução','Armazenamento') NOT NULL,
	`observacao` text,
	`createdBy` int NOT NULL,
	`excluido` boolean NOT NULL DEFAULT false,
	`excluidoPor` int,
	`excluidoEm` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('administrador','gestor','coordenador','cerimonial','beca','logistica','armazenamento','financeiro') NOT NULL DEFAULT 'coordenador';--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('pendente','aprovado','rejeitado') DEFAULT 'pendente' NOT NULL;