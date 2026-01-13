ALTER TABLE `eventos` ADD `acessoComissaoHabilitado` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `eventos` ADD `prazoEdicaoComissao` datetime;--> statement-breakpoint
ALTER TABLE `eventos` ADD `tokenAcessoComissao` varchar(64);--> statement-breakpoint
ALTER TABLE `eventos` ADD CONSTRAINT `eventos_tokenAcessoComissao_unique` UNIQUE(`tokenAcessoComissao`);