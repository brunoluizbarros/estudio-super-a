ALTER TABLE `fotos_formando` MODIFY COLUMN `execucaoFormandoId` int;--> statement-breakpoint
ALTER TABLE `fotos_formando` ADD `briefingFormandoId` int;--> statement-breakpoint
ALTER TABLE `fotos_formando` ADD `horarioInicio` varchar(10);--> statement-breakpoint
ALTER TABLE `fotos_formando` ADD `horarioTermino` varchar(10);