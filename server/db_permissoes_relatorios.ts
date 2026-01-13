import { getDb } from "./db";
import { permissoesRelatorios } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Listar todas as permissões de relatórios
export async function listPermissoesRelatorios() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return await db.select().from(permissoesRelatorios);
}

// Listar permissões de relatórios de um role específico
export async function listPermissoesRelatoriosByRole(role: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return await db.select().from(permissoesRelatorios).where(eq(permissoesRelatorios.role, role as any));
}

// Criar permissão de relatório
export async function createPermissaoRelatorio(data: {
  role: string;
  aba: string;
  visualizar: boolean;
  inserir: boolean;
  excluir: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const [result] = await db.insert(permissoesRelatorios).values(data as any);
  return result;
}

// Atualizar permissão de relatório
export async function updatePermissaoRelatorio(id: number, data: {
  visualizar?: boolean;
  inserir?: boolean;
  excluir?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(permissoesRelatorios).set(data).where(eq(permissoesRelatorios.id, id));
}

// Deletar permissão de relatório
export async function deletePermissaoRelatorio(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.delete(permissoesRelatorios).where(eq(permissoesRelatorios.id, id));
}

// Verificar se usuário tem permissão para uma ação em uma aba de relatório
export async function checkPermissaoRelatorio(
  role: string,
  aba: string,
  acao: "visualizar" | "inserir" | "excluir"
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // Administrador tem todas as permissões
  if (role === "administrador") return true;
  
  // Buscar permissão específica
  const [permissao] = await db
    .select()
    .from(permissoesRelatorios)
    .where(and(
      eq(permissoesRelatorios.role, role as any),
      eq(permissoesRelatorios.aba, aba as any)
    ));
  
  if (!permissao) return false;
  return permissao[acao] || false;
}
