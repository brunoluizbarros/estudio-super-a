ALTER TABLE `vendas` ADD `reuniaoId` int;--> statement-breakpoint
ALTER TABLE `vendas` ADD `fase` enum('Atendimento','Execução','Armazenamento') NOT NULL;