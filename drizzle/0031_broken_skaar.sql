ALTER TABLE `vendas` ADD `excluido` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `vendas` ADD `excluidoPor` int;--> statement-breakpoint
ALTER TABLE `vendas` ADD `excluidoEm` timestamp;