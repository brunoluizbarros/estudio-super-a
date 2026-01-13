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
