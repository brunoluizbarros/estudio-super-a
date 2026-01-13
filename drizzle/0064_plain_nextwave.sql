ALTER TABLE `despesas_v2` ADD `excluido` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `despesas_v2` ADD `excluidoPor` int;--> statement-breakpoint
ALTER TABLE `despesas_v2` ADD `excluidoEm` timestamp;--> statement-breakpoint
ALTER TABLE `despesas_v2` ADD `motivoExclusao` text;