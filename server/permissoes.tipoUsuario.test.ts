import { describe, it, expect, beforeAll } from "vitest";
import { getDb, getTipoUsuarioById } from "./db";
import { eq } from "drizzle-orm";
import { users, permissoes, permissoesRelatorios, permissoesConfiguracoes } from "../drizzle/schema";

describe("Permissões por Tipo de Usuário", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testUserId: number;
  let tipoUsuarioId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Buscar o usuário cirocouceiro@me.com
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, "cirocouceiro@me.com"));

    if (!user) throw new Error("Usuário cirocouceiro@me.com não encontrado");
    
    testUserId = user.id;
    tipoUsuarioId = user.tipoUsuarioId!;
  });

  it("deve retornar o tipo de usuário correto pelo ID", async () => {
    const tipoUsuario = await getTipoUsuarioById(tipoUsuarioId);
    
    expect(tipoUsuario).not.toBeNull();
    expect(tipoUsuario?.nome).toBe("Logística 1");
  });

  it("deve ter permissões configuradas para Logística 1", async () => {
    if (!db) throw new Error("Database not available");

    const permissoesGerais = await db
      .select()
      .from(permissoes)
      .where(eq(permissoes.role, "Logística 1"));

    expect(permissoesGerais.length).toBeGreaterThan(0);
    
    // Verificar que tem permissão para Relatórios
    const permissaoRelatorios = permissoesGerais.find(p => p.secao === "relatorios");
    expect(permissaoRelatorios).toBeDefined();
    expect(permissaoRelatorios?.visualizar).toBe(true);
  });

  it("deve ter permissões de relatórios configuradas para Logística 1", async () => {
    if (!db) throw new Error("Database not available");

    const permRelatorios = await db
      .select()
      .from(permissoesRelatorios)
      .where(eq(permissoesRelatorios.role, "Logística 1"));

    expect(permRelatorios.length).toBeGreaterThan(0);
    
    // Verificar que tem permissão para aba Despesas
    const permissaoDespesas = permRelatorios.find(p => p.aba === "despesas");
    expect(permissaoDespesas).toBeDefined();
    expect(permissaoDespesas?.visualizar).toBe(true);
  });

  it("deve ter permissões de configurações para Logística 1", async () => {
    if (!db) throw new Error("Database not available");

    const permConfiguracoes = await db
      .select()
      .from(permissoesConfiguracoes)
      .where(eq(permissoesConfiguracoes.role, "Logística 1"));

    expect(permConfiguracoes.length).toBeGreaterThan(0);
    
    // Verificar que tem permissão para aba Locais
    const permissaoLocais = permConfiguracoes.find(p => p.aba === "locais");
    expect(permissaoLocais).toBeDefined();
    expect(permissaoLocais?.visualizar).toBe(true);
  });

  it("NÃO deve ter permissão para seções não autorizadas", async () => {
    if (!db) throw new Error("Database not available");

    const permissoesGerais = await db
      .select()
      .from(permissoes)
      .where(eq(permissoes.role, "Logística 1"));

    // Seções que NÃO devem ter permissão de visualizar
    const secoesProibidas = ["turmas", "eventos", "abordagem", "execucao", "reunioes", "briefing", "becas"];
    
    for (const secao of secoesProibidas) {
      const permissao = permissoesGerais.find(p => p.secao === secao);
      expect(permissao).toBeDefined();
      expect(permissao?.visualizar).toBe(false);
    }
  });
});
