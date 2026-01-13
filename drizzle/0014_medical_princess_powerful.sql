CREATE TABLE `briefing_formando` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grupoId` int NOT NULL,
	`eventoId` int NOT NULL,
	`formandoId` int NOT NULL,
	`ordem` int DEFAULT 1,
	`horarioFamiliaComServico` varchar(20),
	`makeFormando` boolean DEFAULT false,
	`cabeloFormando` boolean DEFAULT false,
	`makeFamilia` boolean DEFAULT false,
	`cabeloFamilia` boolean DEFAULT false,
	`qtdFamilia` int DEFAULT 0,
	`qtdPets` int DEFAULT 0,
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
