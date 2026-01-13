CREATE TABLE `backup_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataHora` timestamp NOT NULL,
	`status` enum('sucesso','erro') NOT NULL,
	`mensagem` text,
	`tamanhoArquivo` int,
	`emailEnviado` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backup_logs_id` PRIMARY KEY(`id`)
);
