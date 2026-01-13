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
