ALTER TABLE `permissoes` ADD `tipoUsuarioId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoes_configuracoes` ADD `tipoUsuarioId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoes_relatorios` ADD `tipoUsuarioId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoes` ADD CONSTRAINT `permissoes_tipoUsuarioId_tipos_usuario_id_fk` FOREIGN KEY (`tipoUsuarioId`) REFERENCES `tipos_usuario`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permissoes_configuracoes` ADD CONSTRAINT `permissoes_configuracoes_tipoUsuarioId_tipos_usuario_id_fk` FOREIGN KEY (`tipoUsuarioId`) REFERENCES `tipos_usuario`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permissoes_relatorios` ADD CONSTRAINT `permissoes_relatorios_tipoUsuarioId_tipos_usuario_id_fk` FOREIGN KEY (`tipoUsuarioId`) REFERENCES `tipos_usuario`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permissoes` DROP COLUMN `role`;--> statement-breakpoint
ALTER TABLE `permissoes_configuracoes` DROP COLUMN `role`;--> statement-breakpoint
ALTER TABLE `permissoes_relatorios` DROP COLUMN `role`;