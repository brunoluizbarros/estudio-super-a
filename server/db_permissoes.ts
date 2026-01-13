import { getDb } from "./db";
import { permissoes, users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Listar todas as permissões
export async function listPermissoes() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return await db.select().from(permissoes);
}

// Listar permissões de um role específico (busca por tipoUsuarioId)
export async function listPermissoesByRole(role: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  // Buscar o tipo de usuário pelo nome (role)
  const { tiposUsuario } = await import("../drizzle/schema");
  const [tipoUsuario] = await db.select().from(tiposUsuario).where(eq(tiposUsuario.nome, role));
  
  if (!tipoUsuario) {
    // Se não encontrar tipo de usuário, retornar array vazio
    return [];
  }
  
  // Buscar permissões pelo tipoUsuarioId
  return await db.select().from(permissoes).where(eq(permissoes.tipoUsuarioId, tipoUsuario.id));
}

// Criar permissão
export async function createPermissao(data: {
  role: string;
  secao: string;
  visualizar: boolean;
  inserir: boolean;
  excluir: boolean;
  tipoUsuarioId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const insertData: any = {
    role: data.role,
    secao: data.secao,
    visualizar: data.visualizar,
    inserir: data.inserir,
    excluir: data.excluir,
    tipoUsuarioId: data.tipoUsuarioId, // Usar o tipoUsuarioId fornecido pelo frontend
  };
  
  const [result] = await db.insert(permissoes).values(insertData);
  return result.insertId;
}

// Atualizar permissão
export async function updatePermissao(id: number, data: {
  visualizar?: boolean;
  inserir?: boolean;
  excluir?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(permissoes).set(data).where(eq(permissoes.id, id));
}

// Deletar permissão
export async function deletePermissao(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.delete(permissoes).where(eq(permissoes.id, id));
}

// Verificar se usuário tem permissão para uma ação em uma seção
export async function checkPermissao(
  userId: number,
  secao: string,
  acao: "visualizar" | "inserir" | "excluir"
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  // Buscar role do usuário
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return false;
  
  // Administrador tem todas as permissões
  if (user.role === "administrador") return true;
  
  // Buscar permissão específica
  const [permissao] = await db
    .select()
    .from(permissoes)
    .where(and(eq(permissoes.role, user.role), eq(permissoes.secao, secao)));
  
  if (!permissao) return false;
  
  return permissao[acao] || false;
}

// Listar todos os usuários
export async function listUsuarios() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  return await db.select().from(users);
}

// Atualizar role de um usuário
export async function updateUsuarioRole(userId: number, role: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(users).set({ role: role as any }).where(eq(users.id, userId));
}

// Atualizar status de um usuário
export async function updateUsuarioStatus(userId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.update(users).set({ status: status as any }).where(eq(users.id, userId));
}

// Criar novo usuário
export async function createUsuario(data: {
  openId: string;
  name: string;
  email: string;
  tipoUsuarioId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const [result] = await db.insert(users).values({
    openId: data.openId,
    name: data.name,
    email: data.email,
    tipoUsuarioId: data.tipoUsuarioId,
    role: "coordenador" as any, // Valor padrão obrigatório
  });
  return result.insertId;
}

// Deletar usuário
export async function deleteUsuario(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.delete(users).where(eq(users.id, userId));
}

// Verificar se um usuário tem permissão específica
export async function verificarPermissao(
  role: string,
  secao: string,
  tipo: "visualizar" | "inserir" | "excluir"
): Promise<boolean> {
  // Administrador tem todas as permissões
  if (role === "administrador") return true;

  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  const permissao = await db
    .select()
    .from(permissoes)
    .where(and(eq(permissoes.role, role as any), eq(permissoes.secao, secao as any)))
    .limit(1);
  
  if (!permissao || permissao.length === 0) return false;
  
  return permissao[0][tipo] === true;
}
