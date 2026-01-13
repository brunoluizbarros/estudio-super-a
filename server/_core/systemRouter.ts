import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  fixPermissions: adminProcedure
    .mutation(async () => {
      const { getDb } = await import("../db");
      const { tiposUsuario, permissoes, permissoesRelatorios, permissoesConfiguracoes } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");
      
      const tipos = await db.select().from(tiposUsuario);
      let fixed = 0;
      
      const secoes = [
        "home", "turmas", "eventos", "abordagem", "execucao", 
        "vendas", "reunioes", "servicos", "financeiro", "despesas", 
        "relatorios", "briefing", "becas", "configuracoes"
      ];
      
      const abasRelatorios = [
        "despesas", "emissao_nf", "servicos_make_cabelo", "execucao",
        "compensacao_bancaria", "vendas_excluidas", "observacoes", "fechamentos_mensais"
      ];
      
      const abasConfiguracoes = [
        "instituicoes", "cursos", "cidades", "locais", "tipos_evento",
        "tipos_servico", "fornecedores", "tabela_preco", "taxas_cartao",
        "produtos", "maquiagem"
      ];
      
      for (const tipo of tipos) {
        const roleName = tipo.nome;
        
        const permsExistentes = await db.select().from(permissoes).where(eq(permissoes.role, roleName));
        if (permsExistentes.length === 0) {
          for (const secao of secoes) {
            await db.insert(permissoes).values({
              role: roleName,
              secao: secao,
              visualizar: false,
              inserir: false,
              excluir: false,
            });
          }
          fixed++;
        }
        
        const permsRelExistentes = await db.select().from(permissoesRelatorios).where(eq(permissoesRelatorios.role, roleName));
        if (permsRelExistentes.length === 0) {
          for (const aba of abasRelatorios) {
            await db.insert(permissoesRelatorios).values({
              role: roleName,
              aba: aba as any,
              visualizar: false,
              inserir: false,
              excluir: false,
            });
          }
        }
        
        const permsConfExistentes = await db.select().from(permissoesConfiguracoes).where(eq(permissoesConfiguracoes.role, roleName));
        if (permsConfExistentes.length === 0) {
          for (const aba of abasConfiguracoes) {
            await db.insert(permissoesConfiguracoes).values({
              role: roleName,
              aba: aba as any,
              visualizar: false,
              inserir: false,
              excluir: false,
            });
          }
        }
      }
      
      return { success: true, fixed };
    }),
  
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
