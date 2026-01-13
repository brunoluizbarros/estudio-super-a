ALTER TABLE `permissoes` DROP FOREIGN KEY `permissoes_tipoUsuarioId_tipos_usuario_id_fk`;
--> statement-breakpoint
ALTER TABLE `permissoes_configuracoes` DROP FOREIGN KEY `permissoes_configuracoes_tipoUsuarioId_tipos_usuario_id_fk`;
--> statement-breakpoint
ALTER TABLE `permissoes_relatorios` DROP FOREIGN KEY `permissoes_relatorios_tipoUsuarioId_tipos_usuario_id_fk`;
--> statement-breakpoint
ALTER TABLE `permissoes` ADD `role` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoes_configuracoes` ADD `role` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoes_relatorios` ADD `role` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoes` DROP COLUMN `tipoUsuarioId`;--> statement-breakpoint
ALTER TABLE `permissoes_configuracoes` DROP COLUMN `tipoUsuarioId`;--> statement-breakpoint
ALTER TABLE `permissoes_relatorios` DROP COLUMN `tipoUsuarioId`;