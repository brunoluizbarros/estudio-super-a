import { getDb } from "./db";
import { 
  fechamentosDiarios, 
  transacoesRede, 
  divergenciasFechamento,
  vendas,
  pagamentos,
  type FechamentoDiario,
  type InsertFechamentoDiario,
  type TransacaoRede,
  type InsertTransacaoRede,
  type DivergenciaFechamento,
  type InsertDivergenciaFechamento
} from "../drizzle/schema";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";

// ==================== FECHAMENTOS DIÁRIOS ====================

export async function getFechamentoDiarioPorData(data: string) {
  const db = await getDb();
  if (!db) return null;
  
  // Converter string para Date object para garantir comparação correta
  const dataObj = new Date(data + 'T00:00:00.000Z');
  
  const result = await db
    .select()
    .from(fechamentosDiarios)
    .where(sql`DATE(${fechamentosDiarios.data}) = DATE(${dataObj})`)
    .limit(1);
  
  return result[0] || null;
}

export async function createFechamentoDiario(data: InsertFechamentoDiario) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(fechamentosDiarios).values(data);
  return result;
}

export async function updateFechamentoDiario(id: number, data: Partial<InsertFechamentoDiario>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(fechamentosDiarios).set(data).where(eq(fechamentosDiarios.id, id));
}

export async function listarFechamentosPorPeriodo(dataInicio: string, dataFim: string) {
  const db = await getDb();
  if (!db) return [];
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  
  return await db
    .select()
    .from(fechamentosDiarios)
    .where(and(
      gte(fechamentosDiarios.data, inicio),
      lte(fechamentosDiarios.data, fim)
    ))
    .orderBy(desc(fechamentosDiarios.data));
}

// ==================== VENDAS DO DIA ====================

export async function getVendasDoDia(data: string) {
  const db = await getDb();
  if (!db) return [];
  // Buscar vendas do dia com seus pagamentos
  const vendasDoDia = await db
    .select()
    .from(vendas)
    .where(sql`DATE(${vendas.dataVenda}) = ${data}`)
    .orderBy(vendas.dataVenda);
  
  // Buscar pagamentos de todas as vendas
  const vendaIds = vendasDoDia.map((v: typeof vendas.$inferSelect) => v.id);
  
  if (vendaIds.length === 0) {
    return [];
  }
  
  const pagamentosDoDia = await db
    .select()
    .from(pagamentos)
    .where(sql`${pagamentos.vendaId} IN (${sql.join(vendaIds.map((id: number) => sql`${id}`), sql`, `)})`);
  
  // Combinar vendas com pagamentos
  return vendasDoDia.map((venda: typeof vendas.$inferSelect) => ({
    ...venda,
    pagamentos: pagamentosDoDia.filter((p: typeof pagamentos.$inferSelect) => p.vendaId === venda.id)
  }));
}

export async function getPagamentosCartoesComCv(data: string) {
  const db = await getDb();
  if (!db) return [];
  // Buscar apenas pagamentos de cartão (débito/crédito) que têm CV/NSU
  return await db
    .select({
      id: pagamentos.id,
      vendaId: pagamentos.vendaId,
      tipo: pagamentos.tipo,
      valor: pagamentos.valor,
      valorLiquido: pagamentos.valorLiquido,
      bandeira: pagamentos.bandeira,
      parcelas: pagamentos.parcelas,
      cvNsu: pagamentos.cvNsu,
      dataCompensacao: pagamentos.dataCompensacao,
      createdAt: pagamentos.createdAt,
      dataVenda: vendas.dataVenda
    })
    .from(pagamentos)
    .innerJoin(vendas, eq(vendas.id, pagamentos.vendaId))
    .where(
      and(
        sql`DATE(${vendas.dataVenda}) = ${data}`,
        sql`${pagamentos.tipo} IN ('debito', 'credito')`,
        sql`${pagamentos.cvNsu} IS NOT NULL AND ${pagamentos.cvNsu} != ''`
      )
    );
}

// ==================== TRANSAÇÕES DA REDE ====================

export async function createTransacaoRede(data: InsertTransacaoRede) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(transacoesRede).values(data);
  return result;
}

export async function createTransacoesRedeEmLote(transacoes: InsertTransacaoRede[]) {
  if (transacoes.length === 0) return;
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(transacoesRede).values(transacoes);
  return result;
}

export async function getTransacoesRedePorFechamento(fechamentoDiarioId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(transacoesRede)
    .where(eq(transacoesRede.fechamentoDiarioId, fechamentoDiarioId))
    .orderBy(transacoesRede.dataVenda);
}

export async function updateTransacaoRedeMatching(
  id: number, 
  vendaId: number | null, 
  pagamentoId: number | null,
  statusMatching: "ok" | "divergencia_valor" | "nao_lancado" | "duplicado"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(transacoesRede)
    .set({ vendaId, pagamentoId, statusMatching })
    .where(eq(transacoesRede.id, id));
}

// ==================== DIVERGÊNCIAS ====================

export async function createDivergencia(data: InsertDivergenciaFechamento) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(divergenciasFechamento).values(data);
  return result;
}

export async function createDivergenciasEmLote(divergencias: InsertDivergenciaFechamento[]) {
  if (divergencias.length === 0) return;
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Remover campos opcionais que não devem ser enviados no INSERT
  // (campos com default no banco: statusResolucao, createdAt)
  const divergenciasLimpas = divergencias.map(d => {
    const { justificativa, resolvidoPorId, resolvidoPorNome, resolvidoEm, createdAt, ...resto } = d as any;
    return resto;
  });
  
  const result = await db.insert(divergenciasFechamento).values(divergenciasLimpas);
  return result;
}

export async function getDivergenciasPorFechamento(fechamentoDiarioId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(divergenciasFechamento)
    .where(eq(divergenciasFechamento.fechamentoDiarioId, fechamentoDiarioId))
    .orderBy(divergenciasFechamento.createdAt);
}

export async function updateStatusDivergencia(
  id: number,
  statusResolucao: "pendente" | "aprovado" | "corrigido" | "ignorado",
  justificativa?: string,
  resolvidoPorId?: number,
  resolvidoPorNome?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(divergenciasFechamento)
    .set({
      statusResolucao,
      justificativa,
      resolvidoPorId,
      resolvidoPorNome,
      resolvidoEm: new Date()
    })
    .where(eq(divergenciasFechamento.id, id));
}

export async function resolverDivergencia(
  divergenciaId: number,
  statusResolucao: "aprovado" | "corrigido" | "ignorado",
  justificativa: string,
  resolvidoPorId: number,
  resolvidoPorNome: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(divergenciasFechamento)
    .set({
      statusResolucao,
      justificativa,
      resolvidoPorId,
      resolvidoPorNome,
      resolvidoEm: new Date()
    })
    .where(eq(divergenciasFechamento.id, divergenciaId));
}

export async function resolverDivergenciasEmLote(
  divergenciaIds: number[],
  statusResolucao: "aprovado" | "corrigido" | "ignorado",
  justificativa: string,
  resolvidoPorId: number,
  resolvidoPorNome: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Atualizar todas as divergências de uma vez
  for (const id of divergenciaIds) {
    await db
      .update(divergenciasFechamento)
      .set({
        statusResolucao,
        justificativa,
        resolvidoPorId,
        resolvidoPorNome,
        resolvidoEm: new Date()
      })
      .where(eq(divergenciasFechamento.id, id));
  }
  
  return divergenciaIds.length;
}

export async function limparDadosFechamento(fechamentoDiarioId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Deletar divergências
  await db
    .delete(divergenciasFechamento)
    .where(eq(divergenciasFechamento.fechamentoDiarioId, fechamentoDiarioId));
  
  // Deletar transações da Rede
  await db
    .delete(transacoesRede)
    .where(eq(transacoesRede.fechamentoDiarioId, fechamentoDiarioId));
  
  // Resetar contadores do fechamento
  await db
    .update(fechamentosDiarios)
    .set({
      totalRede: 0,
      quantidadeVendasOk: 0,
      quantidadeDivergencias: 0,
      quantidadeNaoLancadas: 0,
      quantidadeFantasma: 0,
      status: "pendente"
    })
    .where(eq(fechamentosDiarios.id, fechamentoDiarioId));
}
