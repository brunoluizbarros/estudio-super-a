ALTER TABLE `turmas` MODIFY COLUMN `curso` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `turmas` MODIFY COLUMN `instituicao` varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE `turmas` MODIFY COLUMN `cidade` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `turmas` MODIFY COLUMN `estado` varchar(2) NOT NULL;--> statement-breakpoint
ALTER TABLE `turmas` ADD `numeroTurma` varchar(20);--> statement-breakpoint
ALTER TABLE `turmas` ADD `ano` int NOT NULL;--> statement-breakpoint
ALTER TABLE `turmas` ADD `periodo` enum('1','2') DEFAULT '1';--> statement-breakpoint
ALTER TABLE `turmas` DROP COLUMN `nome`;