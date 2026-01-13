ALTER TABLE `notificacoes` MODIFY COLUMN `tipo` enum('despesa_criada','despesa_aprovada_gestor','despesa_aprovada_gestor_geral','despesa_rejeitada_gestor','despesa_rejeitada_gestor_geral','despesa_liquidada','turma_criada','evento_criado','evento_editado','evento_excluido','venda_editada','venda_excluida','lembrete_evento_5dias','lembrete_evento_2dias') NOT NULL;--> statement-breakpoint
ALTER TABLE `notificacoes` ADD `turmaId` int;--> statement-breakpoint
ALTER TABLE `notificacoes` ADD `eventoId` int;--> statement-breakpoint
ALTER TABLE `notificacoes` ADD `vendaId` int;