import { getDb } from "./db";
import { notificacoes } from "../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

// Criar notificação
export async function createNotificacao(data: {
  userId: number;
  tipo: "despesa_criada" | "despesa_aprovada_gestor" | "despesa_aprovada_gestor_geral" | "despesa_rejeitada_gestor" | "despesa_rejeitada_gestor_geral" | "despesa_liquidada" | "turma_criada" | "evento_criado" | "evento_editado" | "evento_excluido" | "venda_editada" | "venda_excluida" | "lembrete_evento_5dias" | "lembrete_evento_2dias";
  titulo: string;
  mensagem: string;
  despesaId?: number;
  turmaId?: number;
  eventoId?: number;
  vendaId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(notificacoes).values(data);
  return result.insertId;
}

// Listar notificações de um usuário
export async function getNotificacoesByUserId(userId: number, limit?: number) {
  const db = await getDb();
  if (!db) return [];
  const query = db
    .select()
    .from(notificacoes)
    .where(eq(notificacoes.userId, userId))
    .orderBy(desc(notificacoes.createdAt));
  
  if (limit) {
    return query.limit(limit);
  }
  
  return query;
}

// Contar notificações não lidas
export async function countNotificacoesNaoLidas(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select()
    .from(notificacoes)
    .where(
      and(
        eq(notificacoes.userId, userId),
        eq(notificacoes.lida, false)
      )
    );
  
  return result.length;
}

// Marcar notificação como lida
export async function marcarComoLida(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(notificacoes)
    .set({ lida: true })
    .where(eq(notificacoes.id, id));
  
  return true;
}

// Marcar todas as notificações de um usuário como lidas
export async function marcarTodasComoLidas(userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(notificacoes)
    .set({ lida: true })
    .where(
      and(
        eq(notificacoes.userId, userId),
        eq(notificacoes.lida, false)
      )
    );
  
  return true;
}

// Deletar notificação
export async function deleteNotificacao(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .delete(notificacoes)
    .where(eq(notificacoes.id, id));
  
  return true;
}

// Listar notificações não lidas
export async function getNotificacoesNaoLidas(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notificacoes)
    .where(
      and(
        eq(notificacoes.userId, userId),
        eq(notificacoes.lida, false)
      )
    )
    .orderBy(desc(notificacoes.createdAt));
}
