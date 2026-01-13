import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users, turmas, formandos, eventos } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Execução - Permissão de Edição de Status para Controle", () => {
  let usuarioControleId: number;
  let turmaId: number;
  let formandoId: number;

  beforeAll(async () => {
    // Criar usuário do tipo Controle
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const [usuarioControle] = await db
      .insert(users)
      .values({
        openId: `test-controle-${Date.now()}`,
        name: "Usuário Controle Teste",
        email: "controle.teste@example.com",
        role: "controle",
        status: "aprovado",
      })
      .$returningId();
    usuarioControleId = usuarioControle.id;

    // Criar turma de teste
    const [turma] = await db
      .insert(turmas)
      .values({
        codigo: "TEST-CONTROLE",
        nome: "Turma Teste Controle",
        curso: "Teste",
        instituicao: "Instituição Teste",
        numeroTurma: "1",
        ano: 2026,
        periodo: "1",
        cidade: "Recife",
        estado: "PE",
      })
      .$returningId();
    turmaId = turma.id;

    // Criar formando de teste
    const [formando] = await db
      .insert(formandos)
      .values({
        turmaId: turmaId,
        codigoFormando: "TEST-001",
        nome: "Formando Teste",
        cpf: "12345678901",
        telefone: "81999999999",
        email: "formando.teste@example.com",
        status: "apto",
        pacote: "Todas as Fotos",
        eComissao: false,
      })
      .$returningId();
    formandoId = formando.id;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    
    // Limpar dados de teste
    if (formandoId) {
      await db.delete(formandos).where(eq(formandos.id, formandoId));
    }
    if (turmaId) {
      await db.delete(turmas).where(eq(turmas.id, turmaId));
    }
    if (usuarioControleId) {
      await db.delete(users).where(eq(users.id, usuarioControleId));
    }
  });

  it("deve permitir que usuário Controle tenha o role 'controle' cadastrado", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const [usuario] = await db
      .select()
      .from(users)
      .where(eq(users.id, usuarioControleId));

    expect(usuario).toBeDefined();
    expect(usuario.role).toBe("controle");
  });

  it("deve validar que o enum de role inclui 'controle'", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // Verificar se é possível criar um usuário com role 'controle'
    const testOpenId = `test-enum-${Date.now()}`;
    const [novoUsuario] = await db
      .insert(users)
      .values({
        openId: testOpenId,
        name: "Teste Enum Controle",
        email: "enum.teste@example.com",
        role: "controle",
        status: "aprovado",
      })
      .$returningId();

    expect(novoUsuario.id).toBeGreaterThan(0);

    // Limpar usuário de teste
    await db.delete(users).where(eq(users.id, novoUsuario.id));
  });

  it("deve permitir que formando tenha status alterado", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // Atualizar status do formando
    await db
      .update(formandos)
      .set({ status: "inapto" })
      .where(eq(formandos.id, formandoId));

    const [formandoAtualizado] = await db
      .select()
      .from(formandos)
      .where(eq(formandos.id, formandoId));

    expect(formandoAtualizado.status).toBe("inapto");

    // Restaurar status original
    await db
      .update(formandos)
      .set({ status: "apto" })
      .where(eq(formandos.id, formandoId));
  });
});
