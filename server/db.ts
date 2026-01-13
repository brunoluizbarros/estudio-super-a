import { eq, desc, sql, and, or, like, gte, lte, isNull, inArray, not } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  turmas, InsertTurma, Turma,
  formandos, InsertFormando, Formando,
  eventos, InsertEvento, Evento,
  agendamentos, InsertAgendamento, Agendamento,
  servicosAgendados, InsertServicoAgendado,
  cenarios, InsertCenario,
  vendas, InsertVenda, Venda,
  itensVenda, InsertItemVenda,
  pagamentos, InsertPagamento,
  historicoAlteracoesVendas, InsertHistoricoAlteracaoVenda,
  taxasCartao, InsertTaxaCartao,
  configMaquiagem, InsertConfigMaquiagem,
  configMaquiagemTurma, InsertConfigMaquiagemTurma,
  produtos, InsertProduto,
  instituicoes, InsertInstituicao,
  cursos, InsertCurso,
  tiposUsuario, InsertTipoUsuario,
  cidades, InsertCidade,
  locais, InsertLocal,
  tiposEvento, InsertTipoEvento,
  tiposServico, InsertTipoServico,
  fornecedores, InsertFornecedor,
  tabelaPrecoFornecedores, InsertTabelaPrecoFornecedor,
  despesas, InsertDespesa,
  anexosDespesas, InsertAnexoDespesa,
  tiposCenario, InsertTipoCenario,
  execucaoFormando, InsertExecucaoFormando,
  fotosFormando, InsertFotoFormando,
  servicosExecucao, InsertServicoExecucao,
  horariosBriefing, InsertHorarioBriefing,
  briefingEvento, InsertBriefingEvento,
  briefingGrupo, InsertBriefingGrupo,
  briefingFormando, InsertBriefingFormando,
  despesasV2, InsertDespesaV2, DespesaV2,
  despesasV2Turmas, InsertDespesaV2Turma,
  despesasV2Datas, InsertDespesaV2Data,
  despesasV2Historico, InsertDespesaV2Historico,
  despesasV2Anexos, InsertDespesaV2Anexo,
  sequenciaCi,
  reunioes, InsertReuniao, Reuniao,
  historicoObservacoes, InsertHistoricoObservacao, HistoricoObservacao,
  permissoes,
  permissoesRelatorios,
  permissoesConfiguracoes,
  usuarioTurmas, InsertUsuarioTurma, UsuarioTurma,
  fechamentosMensais, InsertFechamentoMensal, FechamentoMensal,
  extratosUploads, InsertExtratoUpload, ExtratoUpload
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USERS ====================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    // Verificar se usuário já existe para preservar role e status
    const existingUser = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    
    // Preservar status existente ou definir como pendente para novos usuários
    if (user.status !== undefined) {
      // Status explicitamente fornecido
      values.status = user.status;
      updateSet.status = user.status;
    } else if (user.openId === ENV.ownerOpenId) {
      // Owner sempre aprovado automaticamente
      values.status = 'aprovado';
      updateSet.status = 'aprovado';
    } else if (existingUser.length > 0 && existingUser[0].status) {
      // Preservar status existente
      values.status = existingUser[0].status;
      // Não incluir no updateSet para não sobrescrever
    } else {
      // Novo usuário sem status definido - usar pendente
      values.status = 'pendente';
      updateSet.status = 'pendente';
    }
    
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'administrador';
      updateSet.role = 'administrador';
    } else if (existingUser.length > 0 && existingUser[0].role) {
      // Preservar role existente se usuário já cadastrado
      values.role = existingUser[0].role;
      // Não incluir role no updateSet para não sobrescrever
    } else {
      // Novo usuário sem role definido - usar padrão
      values.role = 'coordenador';
      updateSet.role = 'coordenador';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserOpenId(
  userId: number,
  newOpenId: string,
  additionalFields?: { name?: string | null; loginMethod?: string | null; lastSignedIn?: Date }
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user: database not available");
    return;
  }

  try {
    const updateData: Record<string, unknown> = {
      openId: newOpenId,
      ...additionalFields,
    };

    await db.update(users).set(updateData).where(eq(users.id, userId));
    console.log(`[Database] Updated user ${userId} with new openId: ${newOpenId}`);
  } catch (error) {
    console.error("[Database] Failed to update user openId:", error);
    throw error;
  }
}

export async function cleanupDuplicateUsers(email: string, keepUserId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot cleanup duplicates: database not available");
    return;
  }

  try {
    // Buscar todos os registros com o mesmo email
    const duplicates = await db.select().from(users).where(eq(users.email, email));
    
    if (duplicates.length <= 1) {
      // Não há duplicatas
      return;
    }

    // Deletar todos os registros exceto o que queremos manter
    const idsToDelete = duplicates.filter(u => u.id !== keepUserId).map(u => u.id);
    
    if (idsToDelete.length > 0) {
      await db.delete(users).where(inArray(users.id, idsToDelete));
      console.log(`[Database] Cleaned up ${idsToDelete.length} duplicate user(s) for email ${email}, kept user ID ${keepUserId}`);
    }
  } catch (error) {
    console.error("[Database] Failed to cleanup duplicate users:", error);
    // Não lançar erro para não bloquear o login
  }
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserStatus(userId: number, status: "pendente" | "aprovado" | "rejeitado") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ status }).where(eq(users.id, userId));
}

export async function updateUserTipoUsuario(userId: number, tipoUsuarioId: number | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ tipoUsuarioId }).where(eq(users.id, userId));
}

// ==================== TURMAS ====================
export async function createTurma(data: InsertTurma) {
  // Usar conexão MySQL2 direta para evitar problemas com Drizzle incluindo campo id
  const mysql = await import('mysql2/promise');
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  
  try {
    // Construir SQL manualmente sem incluir campo id
    const columns: string[] = [];
    const values: any[] = [];
    
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        columns.push(`\`${key}\``);
        values.push(value);
      }
    });
    
    const placeholders = values.map(() => '?').join(', ');
    const sqlQuery = `INSERT INTO turmas (${columns.join(', ')}) VALUES (${placeholders})`;
    
    const [result] = await connection.execute(sqlQuery, values) as any;
    await connection.end();
    
    return result.insertId;
  } catch (error) {
    await connection.end();
    throw error;
  }
}

export async function getAllTurmas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(turmas).orderBy(desc(turmas.createdAt));
}

export async function getTurmaById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(turmas).where(eq(turmas.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updateTurma(id: number, data: Partial<InsertTurma>) {
  const db = await getDb();
  if (!db) return;
  await db.update(turmas).set(data).where(eq(turmas.id, id));
}

export async function deleteTurma(id: number) {
  const db = await getDb();
  if (!db) return;
  
  // Verificar se existem formandos vinculados a esta turma
  const formandosVinculados = await db.select().from(formandos).where(eq(formandos.turmaId, id));
  if (formandosVinculados.length > 0) {
    throw new Error(`Não é possível excluir esta turma pois existem ${formandosVinculados.length} formando(s) vinculado(s) a ela.`);
  }
  
  // Verificar se existem eventos vinculados a esta turma
  const eventosVinculados = await db.select().from(eventos).where(eq(eventos.turmaId, id));
  if (eventosVinculados.length > 0) {
    throw new Error(`Não é possível excluir esta turma pois existem ${eventosVinculados.length} evento(s) vinculado(s) a ela.`);
  }
  
  await db.delete(turmas).where(eq(turmas.id, id));
}

// ==================== FORMANDOS ====================
export async function createFormando(data: InsertFormando) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Construir objeto de inserção explicitamente com apenas os campos válidos
  const insertData: Partial<InsertFormando> = {
    turmaId: data.turmaId,
    codigoFormando: data.codigoFormando,
    nome: data.nome,
  };
  
  // Adicionar campos opcionais apenas se tiverem valor
  if (data.cpf) insertData.cpf = data.cpf;
  if (data.telefone) insertData.telefone = data.telefone;
  if (data.email) insertData.email = data.email;
  if (data.genero) insertData.genero = data.genero;
  if (data.pacote) insertData.pacote = data.pacote;
  if (data.status) insertData.status = data.status;
  if (data.eComissao !== undefined) insertData.eComissao = data.eComissao;
  
  const result = await db.insert(formandos).values(insertData as InsertFormando);
  return result[0].insertId;
}

export async function getFormandosByTurma(turmaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(formandos).where(eq(formandos.turmaId, turmaId)).orderBy(formandos.nome);
}

export async function getFormandoById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(formandos).where(eq(formandos.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updateFormando(id: number, data: Partial<InsertFormando>) {
  const db = await getDb();
  if (!db) return;
  // Filtrar campos undefined, mas manter campos null (para limpar valores)
  const filteredData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
  // Verificar se há campos para atualizar
  if (Object.keys(filteredData).length === 0) {
    return; // Não há nada para atualizar
  }
  await db.update(formandos).set(filteredData).where(eq(formandos.id, id));
}

export async function syncBecaToBriefing(formandoId: number, tamanhoBeca: string | null) {
  const db = await getDb();
  if (!db) return;
  // Atualizar todos os registros de briefing_formando deste formando
  await db.update(briefingFormando)
    .set({ tamanhoBeca })
    .where(eq(briefingFormando.formandoId, formandoId));
}

export async function syncBecaToFormando(briefingFormandoId: number, tamanhoBeca: string | null) {
  const db = await getDb();
  if (!db) return;
  // Buscar o formandoId do registro de briefing
  const briefing = await db.select().from(briefingFormando).where(eq(briefingFormando.id, briefingFormandoId)).limit(1);
  if (briefing.length === 0) return;
  // Atualizar o formando
  await db.update(formandos)
    .set({ tamanhoBeca })
    .where(eq(formandos.id, briefing[0].formandoId));
}

export async function deleteFormando(id: number) {
  const db = await getDb();
  if (!db) return;
  
  // Verificar se existem vendas vinculadas a este formando
  const vendasVinculadas = await db.select().from(vendas).where(eq(vendas.formandoId, id));
  if (vendasVinculadas.length > 0) {
    throw new Error(`Não é possível excluir este formando pois existem ${vendasVinculadas.length} venda(s) vinculada(s) a ele.`);
  }
  
  await db.delete(formandos).where(eq(formandos.id, id));
}

// ==================== EVENTOS ====================
export async function createEvento(data: InsertEvento) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(eventos).values(data);
  return result[0].insertId;
}

export async function getAllEventos() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(eventos).orderBy(desc(eventos.dataEvento));
}

export async function getEventosByTurma(turmaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(eventos).where(eq(eventos.turmaId, turmaId)).orderBy(desc(eventos.dataEvento));
}

export async function getEventoById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(eventos).where(eq(eventos.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getEventosByData(data: Date) {
  const db = await getDb();
  if (!db) return [];
  const startOfDay = new Date(data);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(data);
  endOfDay.setHours(23, 59, 59, 999);
  
  return db.select().from(eventos)
    .where(and(
      gte(eventos.dataEvento, startOfDay),
      lte(eventos.dataEvento, endOfDay)
    ))
    .orderBy(eventos.dataEvento);
}

export async function updateEvento(id: number, data: Partial<InsertEvento>) {
  const db = await getDb();
  if (!db) return;
  await db.update(eventos).set(data).where(eq(eventos.id, id));
}

export async function deleteEvento(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(eventos).where(eq(eventos.id, id));
}

// ==================== AGENDAMENTOS ====================
export async function createAgendamento(data: InsertAgendamento) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(agendamentos).values(data);
  return result[0].insertId;
}

export async function getAgendamentosByEvento(eventoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agendamentos).where(eq(agendamentos.eventoId, eventoId)).orderBy(agendamentos.horaFormando);
}

export async function getAgendamentosByTurma(turmaId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar agendamentos de todos os eventos da turma
  const eventosData = await db.select().from(eventos).where(eq(eventos.turmaId, turmaId));
  if (eventosData.length === 0) return [];
  
  const eventoIds = eventosData.map(e => e.id);
  
  const result = await db
    .select({
      agendamento: agendamentos,
      formando: formandos,
    })
    .from(agendamentos)
    .innerJoin(formandos, eq(agendamentos.formandoId, formandos.id))
    .where(inArray(agendamentos.eventoId, eventoIds))
    .orderBy(agendamentos.horaFormando);
  
  return result;
}

export async function getAgendamentoById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(agendamentos).where(eq(agendamentos.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getAgendamentosComDetalhes(eventoId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      agendamento: agendamentos,
      formando: formandos,
    })
    .from(agendamentos)
    .innerJoin(formandos, eq(agendamentos.formandoId, formandos.id))
    .where(eq(agendamentos.eventoId, eventoId))
    .orderBy(agendamentos.horaFormando);
  
  return result;
}

export async function updateAgendamento(id: number, data: Partial<InsertAgendamento>) {
  const db = await getDb();
  if (!db) return;
  await db.update(agendamentos).set(data).where(eq(agendamentos.id, id));
}

export async function deleteAgendamento(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(agendamentos).where(eq(agendamentos.id, id));
}

// ==================== SERVIÇOS AGENDADOS ====================
export async function createServicoAgendado(data: InsertServicoAgendado) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(servicosAgendados).values(data);
  return result[0].insertId;
}

export async function getServicosByAgendamento(agendamentoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(servicosAgendados).where(eq(servicosAgendados.agendamentoId, agendamentoId));
}

export async function updateServicoAgendado(id: number, data: Partial<InsertServicoAgendado>) {
  const db = await getDb();
  if (!db) return;
  await db.update(servicosAgendados).set(data).where(eq(servicosAgendados.id, id));
}

// ==================== CENÁRIOS ====================
export async function createCenario(data: InsertCenario) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(cenarios).values(data);
  return result[0].insertId;
}

export async function getCenariosByAgendamento(agendamentoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cenarios).where(eq(cenarios.agendamentoId, agendamentoId));
}

export async function updateCenario(id: number, data: Partial<InsertCenario>) {
  const db = await getDb();
  if (!db) return;
  await db.update(cenarios).set(data).where(eq(cenarios.id, id));
}

export async function deleteCenario(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cenarios).where(eq(cenarios.id, id));
}

// ==================== VENDAS ====================
export async function createVenda(data: InsertVenda) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(vendas).values(data);
  return result[0].insertId;
}

export async function getAllVendas() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      id: vendas.id,
      agendamentoId: vendas.agendamentoId,
      eventoId: vendas.eventoId,
      formandoId: vendas.formandoId,
      dataVenda: vendas.dataVenda,
      valorTotal: vendas.valorTotal,
      valorLiquido: vendas.valorLiquido,
      status: vendas.status,
      observacao: vendas.observacao,
      createdBy: vendas.createdBy,
      excluido: vendas.excluido,
      createdAt: vendas.createdAt,
      updatedAt: vendas.updatedAt,
      formandoNome: formandos.nome,
      formandoCpf: formandos.cpf,
      formandoEmail: formandos.email,
      turmaCodigo: turmas.codigo,
      turmaCursos: turmas.cursos,
      turmaInstituicoes: turmas.instituicoes,
      turmaNumero: turmas.numeroTurma,
      turmaAno: turmas.anos,
      turmaPeriodo: turmas.periodos,
      eventoData: eventos.dataEvento,
      criadoPorNome: users.name, // Nome do usuário que criou a venda
    })
    .from(vendas)
    .leftJoin(formandos, eq(vendas.formandoId, formandos.id))
    .leftJoin(turmas, eq(formandos.turmaId, turmas.id))
    .leftJoin(eventos, eq(vendas.eventoId, eventos.id))
    .leftJoin(users, eq(vendas.createdBy, users.id))
    .where(eq(vendas.excluido, false))
    .orderBy(desc(vendas.dataVenda));
  return result;
}

export async function getVendaById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(vendas).where(eq(vendas.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getVendasByAgendamento(agendamentoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendas).where(
    and(
      eq(vendas.agendamentoId, agendamentoId),
      eq(vendas.excluido, false)
    )
  );
}

export async function getVendasByFormando(formandoId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      id: vendas.id,
      eventoId: vendas.eventoId,
      formandoId: vendas.formandoId,
      dataVenda: vendas.dataVenda,
      valorTotal: vendas.valorTotal,
      status: vendas.status,
      createdAt: vendas.createdAt,
      eventoData: eventos.dataEvento,
      tipoEvento: eventos.tipoEvento,
    })
    .from(vendas)
    .leftJoin(eventos, eq(vendas.eventoId, eventos.id))
    .where(
      and(
        eq(vendas.formandoId, formandoId),
        eq(vendas.excluido, false)
      )
    )
    .orderBy(desc(vendas.dataVenda));
  return result;
}

export async function updateVenda(id: number, data: Partial<InsertVenda>) {
  const db = await getDb();
  if (!db) return;
  await db.update(vendas).set(data).where(eq(vendas.id, id));
}

// ==================== ITENS DE VENDA ====================
export async function createItemVenda(data: InsertItemVenda) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(itensVenda).values(data);
  return result[0].insertId;
}

export async function getItensByVenda(vendaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(itensVenda).where(eq(itensVenda.vendaId, vendaId));
}

// ==================== PAGAMENTOS ====================
export async function createPagamento(data: InsertPagamento) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(pagamentos).values(data);
  return result[0].insertId;
}

export async function getPagamentosByVenda(vendaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pagamentos).where(eq(pagamentos.vendaId, vendaId));
}

export async function deleteItensByVenda(vendaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(itensVenda).where(eq(itensVenda.vendaId, vendaId));
}

export async function deletePagamentosByVenda(vendaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(pagamentos).where(eq(pagamentos.vendaId, vendaId));
}

export async function deleteVenda(vendaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(vendas).where(eq(vendas.id, vendaId));
}

export async function softDeleteVenda(vendaId: number, userId: number, motivoExclusao?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(vendas)
    .set({ 
      excluido: true, 
      excluidoPor: userId, 
      excluidoEm: new Date(),
      motivoExclusao: motivoExclusao || null,
    })
    .where(eq(vendas.id, vendaId));
}

// ==================== TAXAS CARTÃO ====================
export async function createTaxaCartao(data: InsertTaxaCartao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(taxasCartao).values(data);
  return result[0].insertId;
}

export async function getAllTaxasCartao() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taxasCartao).orderBy(taxasCartao.bandeira, taxasCartao.parcelas);
}

export async function getTaxaCartao(tipoPagamento: string, bandeira: string, parcelas: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(taxasCartao)
    .where(and(
      eq(taxasCartao.tipoPagamento, tipoPagamento),
      eq(taxasCartao.bandeira, bandeira),
      eq(taxasCartao.parcelas, parcelas)
    ))
    .limit(1);
  return result[0] ?? null;
}

// ==================== CONFIG MAQUIAGEM ====================
export async function createConfigMaquiagem(data: InsertConfigMaquiagem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(configMaquiagem).values(data);
  return result[0].insertId;
}

export async function getAllConfigMaquiagem() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(configMaquiagem).orderBy(configMaquiagem.cidade);
}

export async function updateConfigMaquiagem(id: number, data: Partial<InsertConfigMaquiagem>) {
  const db = await getDb();
  if (!db) return;
  await db.update(configMaquiagem).set(data).where(eq(configMaquiagem.id, id));
}

// ==================== CONFIG MAQUIAGEM POR TURMA ====================
export async function getAllConfigMaquiagemTurma() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(configMaquiagemTurma).orderBy(desc(configMaquiagemTurma.createdAt));
}

export async function getConfigMaquiagemByTurma(turmaId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(configMaquiagemTurma).where(eq(configMaquiagemTurma.turmaId, turmaId)).limit(1);
  return result[0] ?? null;
}

// Função para buscar valores de maquiagem com fallback (turma -> cidade -> padrão Recife)
export async function getValoresMaquiagemByTurma(turmaId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // 1. Tentar buscar configuração específica da turma
  const configTurma = await db.select().from(configMaquiagemTurma)
    .where(eq(configMaquiagemTurma.turmaId, turmaId))
    .limit(1);
  
  if (configTurma.length > 0) {
    return {
      valorMasculino: configTurma[0].valorMasculino,
      valorFeminino: configTurma[0].valorFeminino,
      valorFamilia: configTurma[0].valorFamilia,
      fonte: 'turma' as const
    };
  }
  
  // 2. Buscar cidade da turma e tentar configuração por cidade
  const turma = await db.select({ cidade: turmas.cidade })
    .from(turmas)
    .where(eq(turmas.id, turmaId))
    .limit(1);
  
  if (turma.length > 0 && turma[0].cidade) {
    const configCidade = await db.select().from(configMaquiagem)
      .where(eq(configMaquiagem.cidade, turma[0].cidade))
      .limit(1);
    
    if (configCidade.length > 0) {
      return {
        valorMasculino: configCidade[0].valorMasculino,
        valorFeminino: configCidade[0].valorFeminino,
        valorFamilia: configCidade[0].valorComissaoFamilia || 3000,
        fonte: 'cidade' as const
      };
    }
  }
  
  // 3. Fallback para valores padrão de Recife
  const configRecife = await db.select().from(configMaquiagem)
    .where(eq(configMaquiagem.cidade, 'Recife'))
    .limit(1);
  
  if (configRecife.length > 0) {
    return {
      valorMasculino: configRecife[0].valorMasculino,
      valorFeminino: configRecife[0].valorFeminino,
      valorFamilia: configRecife[0].valorComissaoFamilia || 3000,
      fonte: 'padrao' as const
    };
  }
  
  // 4. Fallback final (valores hardcoded)
  return {
    valorMasculino: 1815, // R$ 18,15
    valorFeminino: 3080,  // R$ 30,80
    valorFamilia: 3000,   // R$ 30,00
    fonte: 'hardcoded' as const
  };
}

export async function createConfigMaquiagemTurma(data: InsertConfigMaquiagemTurma) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(configMaquiagemTurma).values(data);
  return result[0].insertId;
}

export async function updateConfigMaquiagemTurma(id: number, data: Partial<InsertConfigMaquiagemTurma>) {
  const db = await getDb();
  if (!db) return;
  await db.update(configMaquiagemTurma).set(data).where(eq(configMaquiagemTurma.id, id));
}

export async function deleteConfigMaquiagemTurma(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(configMaquiagemTurma).where(eq(configMaquiagemTurma.id, id));
}

export async function updateMultipleConfigMaquiagemTurma(ids: number[], data: Partial<InsertConfigMaquiagemTurma>) {
  const db = await getDb();
  if (!db) return;
  
  // Atualizar cada configuração individualmente
  for (const id of ids) {
    await db.update(configMaquiagemTurma).set(data).where(eq(configMaquiagemTurma.id, id));
  }
}

// ==================== PRODUTOS ====================
export async function createProduto(data: InsertProduto) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(produtos).values(data);
  return result[0].insertId;
}

export async function getAllProdutos() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(produtos).where(eq(produtos.ativo, true)).orderBy(produtos.nome);
}

export async function getProdutoById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(produtos).where(eq(produtos.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updateProduto(id: number, data: Partial<InsertProduto>) {
  const db = await getDb();
  if (!db) return;
  await db.update(produtos).set(data).where(eq(produtos.id, id));
}

// ==================== DASHBOARD STATS ====================
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const [totalTurmas] = await db.select({ count: sql<number>`count(*)` }).from(turmas);
  const [totalFormandos] = await db.select({ count: sql<number>`count(*)` }).from(formandos);
  const [totalEventos] = await db.select({ count: sql<number>`count(*)` }).from(eventos);
  const [eventosHoje] = await db.select({ count: sql<number>`count(*)` }).from(eventos)
    .where(and(gte(eventos.dataEvento, hoje), lte(eventos.dataEvento, amanha)));
  const [totalVendas] = await db.select({ count: sql<number>`count(*)` }).from(vendas);
  const [somaVendas] = await db.select({ total: sql<number>`COALESCE(SUM(valorTotal), 0)` }).from(vendas)
    .where(eq(vendas.status, "pago"));

  return {
    totalTurmas: totalTurmas?.count ?? 0,
    totalFormandos: totalFormandos?.count ?? 0,
    totalEventos: totalEventos?.count ?? 0,
    eventosHoje: eventosHoje?.count ?? 0,
    totalVendas: totalVendas?.count ?? 0,
    valorTotalVendas: somaVendas?.total ?? 0,
  };
}

export async function deleteProduto(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(produtos).where(eq(produtos.id, id));
}

export async function updateTaxaCartao(id: number, data: Partial<InsertTaxaCartao>) {
  const db = await getDb();
  if (!db) return;
  await db.update(taxasCartao).set(data).where(eq(taxasCartao.id, id));
}

export async function deleteTaxaCartao(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(taxasCartao).where(eq(taxasCartao.id, id));
}

// ==================== TIPOS DE USUÁRIO ====================
export async function getTipoUsuarioById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(tiposUsuario).where(eq(tiposUsuario.id, id));
  return result || null;
}

export async function listTiposUsuario() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tiposUsuario).orderBy(tiposUsuario.nome);
}

export async function createTipoUsuario(data: InsertTipoUsuario) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(tiposUsuario).values(data);
  const tipoId = result.insertId;
  
  // Criar permissões padrão para o novo tipo de usuário
  const roleName = data.nome;
  
  // Seções principais do sistema
  const secoes = [
    "home", "turmas", "eventos", "abordagem", "execucao", 
    "vendas", "reunioes", "servicos", "financeiro", "despesas", 
    "relatorios", "briefing", "becas", "configuracoes"
  ];
  
  // Criar permissões gerais (todas desabilitadas por padrão)
  for (const secao of secoes) {
    const permData: any = {
      role: roleName,
      secao: secao,
      visualizar: false,
      inserir: false,
      excluir: false,
    };
    // Remover campo id se existir
    delete permData.id;
    await db.insert(permissoes).values(permData);
  }
  
  // Criar permissões de relatórios (todas desabilitadas por padrão)
  const abasRelatorios = [
    "despesas", "emissao_nf", "servicos_make_cabelo", "execucao",
    "compensacao_bancaria", "vendas_excluidas", "observacoes", "fechamentos_mensais"
  ];
  
  for (const aba of abasRelatorios) {
    await db.insert(permissoesRelatorios).values({
      role: roleName,
      aba: aba as any,
      visualizar: false,
      inserir: false,
      excluir: false,
    });
  }
  
  // Criar permissões de configurações (todas desabilitadas por padrão)
  const abasConfiguracoes = [
    "instituicoes", "cursos", "cidades", "locais", "tipos_evento",
    "tipos_servico", "fornecedores", "tabela_preco", "taxas_cartao",
    "produtos", "maquiagem"
  ];
  
  for (const aba of abasConfiguracoes) {
    await db.insert(permissoesConfiguracoes).values({
      role: roleName,
      aba: aba as any,
      visualizar: false,
      inserir: false,
      excluir: false,
    });
  }
  
  return tipoId;
}

export async function updateTipoUsuario(id: number, data: Partial<InsertTipoUsuario>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tiposUsuario).set(data).where(eq(tiposUsuario.id, id));
}

export async function deleteTipoUsuario(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tiposUsuario).where(eq(tiposUsuario.id, id));
}

// ==================== INSTITUIÇÕES ====================
export async function listInstituicoes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(instituicoes).orderBy(instituicoes.nome);
}

export async function createInstituicao(data: InsertInstituicao) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(instituicoes).values(data);
  return result.insertId;
}

export async function updateInstituicao(id: number, data: Partial<InsertInstituicao>) {
  const db = await getDb();
  if (!db) return;
  await db.update(instituicoes).set(data).where(eq(instituicoes.id, id));
}

export async function deleteInstituicao(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(instituicoes).where(eq(instituicoes.id, id));
}

// ==================== CURSOS ====================
export async function listCursos() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cursos).orderBy(cursos.nome);
}

export async function createCurso(data: InsertCurso) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(cursos).values(data);
  return result.insertId;
}

export async function updateCurso(id: number, data: Partial<InsertCurso>) {
  const db = await getDb();
  if (!db) return;
  await db.update(cursos).set(data).where(eq(cursos.id, id));
}

export async function deleteCurso(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cursos).where(eq(cursos.id, id));
}

// ==================== CIDADES ====================
export async function listCidades() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cidades).orderBy(cidades.estado, cidades.nome);
}

export async function createCidade(data: InsertCidade) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(cidades).values(data);
  return result.insertId;
}

export async function updateCidade(id: number, data: Partial<InsertCidade>) {
  const db = await getDb();
  if (!db) return;
  await db.update(cidades).set(data).where(eq(cidades.id, id));
}

export async function deleteCidade(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cidades).where(eq(cidades.id, id));
}

// ==================== LOCAIS ====================
export async function listLocais() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(locais).orderBy(locais.nome);
}

export async function createLocal(data: InsertLocal) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(locais).values(data);
  return result.insertId;
}

export async function updateLocal(id: number, data: Partial<InsertLocal>) {
  const db = await getDb();
  if (!db) return;
  await db.update(locais).set(data).where(eq(locais.id, id));
}

export async function deleteLocal(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(locais).where(eq(locais.id, id));
}

// ==================== TIPOS DE EVENTO ====================
export async function listTiposEvento() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tiposEvento).orderBy(tiposEvento.nome);
}

export async function createTipoEvento(data: InsertTipoEvento) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(tiposEvento).values(data);
  return result.insertId;
}

export async function updateTipoEvento(id: number, data: Partial<InsertTipoEvento>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tiposEvento).set(data).where(eq(tiposEvento.id, id));
}

export async function deleteTipoEvento(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tiposEvento).where(eq(tiposEvento.id, id));
}

// ==================== TIPOS DE SERVIÇO ====================
export async function listTiposServico() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tiposServico).orderBy(tiposServico.nome);
}

export async function createTipoServico(data: InsertTipoServico) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(tiposServico).values(data);
  return result.insertId;
}

export async function updateTipoServico(id: number, data: Partial<InsertTipoServico>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tiposServico).set(data).where(eq(tiposServico.id, id));
}

export async function deleteTipoServico(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tiposServico).where(eq(tiposServico.id, id));
}

// ==================== FORNECEDORES ====================
export async function listFornecedores() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fornecedores).orderBy(fornecedores.nome);
}

export async function getFornecedorById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(fornecedores).where(eq(fornecedores.id, id));
  return result || null;
}

export async function createFornecedor(data: InsertFornecedor) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(fornecedores).values(data);
  return result.insertId;
}

export async function updateFornecedor(id: number, data: Partial<InsertFornecedor>) {
  const db = await getDb();
  if (!db) return;
  await db.update(fornecedores).set(data).where(eq(fornecedores.id, id));
}

export async function deleteFornecedor(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(fornecedores).where(eq(fornecedores.id, id));
}

// ==================== TABELA DE PREÇO FORNECEDORES ====================
export async function listTabelaPrecoFornecedores() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tabelaPrecoFornecedores).orderBy(tabelaPrecoFornecedores.id);
}

export async function getTabelaPrecoByFornecedor(fornecedorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tabelaPrecoFornecedores).where(eq(tabelaPrecoFornecedores.fornecedorId, fornecedorId));
}

export async function createTabelaPrecoFornecedor(data: InsertTabelaPrecoFornecedor) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(tabelaPrecoFornecedores).values(data);
  return result.insertId;
}

export async function updateTabelaPrecoFornecedor(id: number, data: Partial<InsertTabelaPrecoFornecedor>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tabelaPrecoFornecedores).set(data).where(eq(tabelaPrecoFornecedores.id, id));
}

export async function deleteTabelaPrecoFornecedor(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tabelaPrecoFornecedores).where(eq(tabelaPrecoFornecedores.id, id));
}

// ==================== DESPESAS ====================
export async function listDespesas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(despesas).orderBy(desc(despesas.createdAt));
}

export async function getDespesaById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(despesas).where(eq(despesas.id, id));
  return result || null;
}

export async function getNextNumeroCi() {
  const db = await getDb();
  if (!db) return "001-" + new Date().getFullYear();
  
  const currentYear = new Date().getFullYear();
  const [lastDespesa] = await db
    .select({ numeroCi: despesas.numeroCi })
    .from(despesas)
    .where(like(despesas.numeroCi, `%-${currentYear}`))
    .orderBy(desc(despesas.numeroCi))
    .limit(1);
  
  if (!lastDespesa) {
    return `001-${currentYear}`;
  }
  
  const lastNumber = parseInt(lastDespesa.numeroCi.split("-")[0]);
  const nextNumber = (lastNumber + 1).toString().padStart(3, "0");
  return `${nextNumber}-${currentYear}`;
}

export async function createDespesa(data: InsertDespesa) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(despesas).values(data);
  return result.insertId;
}

export async function updateDespesa(id: number, data: Partial<InsertDespesa>) {
  const db = await getDb();
  if (!db) return;
  await db.update(despesas).set(data).where(eq(despesas.id, id));
}

export async function deleteDespesa(id: number) {
  const db = await getDb();
  if (!db) return;
  // Primeiro deleta os anexos
  await db.delete(anexosDespesas).where(eq(anexosDespesas.despesaId, id));
  // Depois deleta a despesa
  await db.delete(despesas).where(eq(despesas.id, id));
}

// ==================== ANEXOS DESPESAS ====================
export async function listAnexosByDespesa(despesaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(anexosDespesas).where(eq(anexosDespesas.despesaId, despesaId));
}

export async function createAnexoDespesa(data: InsertAnexoDespesa) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(anexosDespesas).values(data);
  return result.insertId;
}

export async function deleteAnexoDespesa(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(anexosDespesas).where(eq(anexosDespesas.id, id));
}


// ==================== TIPOS DE CENÁRIO ====================
export async function listTiposCenario() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tiposCenario).orderBy(tiposCenario.nome);
}

export async function createTipoCenario(data: InsertTipoCenario) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(tiposCenario).values(data);
  return result.insertId;
}

export async function updateTipoCenario(id: number, data: Partial<InsertTipoCenario>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tiposCenario).set(data).where(eq(tiposCenario.id, id));
}

export async function deleteTipoCenario(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tiposCenario).where(eq(tiposCenario.id, id));
}

// ==================== EXECUÇÃO FORMANDO ====================
export async function getExecucaoFormando(eventoId: number, formandoId: number) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(execucaoFormando)
    .where(and(
      eq(execucaoFormando.eventoId, eventoId),
      eq(execucaoFormando.formandoId, formandoId)
    ));
  return result || null;
}

export async function upsertExecucaoFormando(data: InsertExecucaoFormando) {
  const db = await getDb();
  if (!db) return null;
  
  // Verificar se já existe
  const existing = await getExecucaoFormando(data.eventoId, data.formandoId);
  
  if (existing) {
    // Construir objeto de atualização apenas com campos definidos
    const updateData: Record<string, any> = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.arquivoEntregue !== undefined) updateData.arquivoEntregue = data.arquivoEntregue;
    if (data.dataExecucao !== undefined) updateData.dataExecucao = data.dataExecucao;
    if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;
    
    // Só fazer update se houver campos para atualizar
    if (Object.keys(updateData).length > 0) {
      await db.update(execucaoFormando)
        .set(updateData)
        .where(eq(execucaoFormando.id, existing.id));
    }
    return existing.id;
  } else {
    const [result] = await db.insert(execucaoFormando).values(data);
    return result.insertId;
  }
}

export async function listExecucaoFormandosByEvento(eventoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(execucaoFormando)
    .where(eq(execucaoFormando.eventoId, eventoId));
}

// ==================== FOTOS FORMANDO ====================
export async function listFotosFormando(execucaoFormandoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fotosFormando)
    .where(eq(fotosFormando.execucaoFormandoId, execucaoFormandoId));
}

export async function createFotoFormando(data: InsertFotoFormando) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(fotosFormando).values(data);
  return result.insertId;
}

export async function updateFotoFormando(id: number, data: Partial<InsertFotoFormando>) {
  const db = await getDb();
  if (!db) return;
  await db.update(fotosFormando).set(data).where(eq(fotosFormando.id, id));
}

export async function deleteFotoFormando(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(fotosFormando).where(eq(fotosFormando.id, id));
}

export async function deleteAllFotosFormando(execucaoFormandoId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(fotosFormando).where(eq(fotosFormando.execucaoFormandoId, execucaoFormandoId));
}

export async function listFotosFormandoByBriefing(briefingFormandoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fotosFormando)
    .where(eq(fotosFormando.briefingFormandoId, briefingFormandoId));
}

export async function upsertFotoFormandoByBriefing(data: {
  briefingFormandoId: number;
  cenarioId: number;
  horarioInicio?: string;
  horarioTermino?: string;
  observacao?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  
  // Verificar se já existe registro para este formando e cenário
  const existing = await db.select().from(fotosFormando)
    .where(and(
      eq(fotosFormando.briefingFormandoId, data.briefingFormandoId),
      eq(fotosFormando.cenarioId, data.cenarioId)
    ));
  
  if (existing.length > 0) {
    // Atualizar registro existente
    await db.update(fotosFormando)
      .set({
        horarioInicio: data.horarioInicio,
        horarioTermino: data.horarioTermino,
        observacao: data.observacao,
      })
      .where(eq(fotosFormando.id, existing[0].id));
    return existing[0].id;
  } else {
    // Criar novo registro
    const [result] = await db.insert(fotosFormando).values(data);
    return result.insertId;
  }
}

// ==================== SERVIÇOS EXECUÇÃO (Make e Cabelo) ====================
export async function createServicoExecucao(data: {
  eventoId: number;
  formandoId: number;
  tipoServico: 'make_formando' | 'make_familia' | 'cabelo_simples' | 'cabelo_combinado';
  fornecedorId?: number;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  fluxo: 'pagar' | 'receber';
  tipoMake?: 'masc' | 'fem'; // Tipo de make do formando (Masc ou Fem)
  dataRealizacao?: Date;
  observacao?: string;
}) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(servicosExecucao).values({
    eventoId: data.eventoId,
    formandoId: data.formandoId,
    tipoServico: data.tipoServico,
    fornecedorId: data.fornecedorId,
    quantidade: data.quantidade,
    valorUnitario: data.valorUnitario,
    valorTotal: data.valorTotal,
    fluxo: data.fluxo,
    tipoMake: data.tipoMake,
    dataRealizacao: data.dataRealizacao,
    observacao: data.observacao,
  });
  return result[0].insertId;
}

export async function listServicosExecucaoByEvento(eventoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(servicosExecucao).where(eq(servicosExecucao.eventoId, eventoId));
}

export async function listServicosExecucaoByFormando(formandoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(servicosExecucao).where(eq(servicosExecucao.formandoId, formandoId));
}

export async function listServicosExecucaoByEventoFormando(eventoId: number, formandoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(servicosExecucao).where(
    and(
      eq(servicosExecucao.eventoId, eventoId),
      eq(servicosExecucao.formandoId, formandoId)
    )
  );
}

export async function deleteServicoExecucao(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(servicosExecucao).where(eq(servicosExecucao.id, id));
}

export async function deleteServicosExecucaoByEventoFormando(eventoId: number, formandoId: number) {
  const db = await getDb();
  if (!db) return;
  
  // Deletar os serviços diretamente sem select prévio
  await db.delete(servicosExecucao).where(
    and(
      eq(servicosExecucao.eventoId, eventoId),
      eq(servicosExecucao.formandoId, formandoId)
    )
  );
}

// Relatório de Maquiagem - Compensação por fornecedora
export async function getRelatorioMaquiagem(filtros: {
  dataInicio?: Date;
  dataFim?: Date;
  turmaId?: number;
}) {
  const db = await getDb();
  if (!db) return { servicos: [], resumoPorFornecedor: [] };
  
  // Buscar todos os serviços de make
  let query = db.select({
    id: servicosExecucao.id,
    eventoId: servicosExecucao.eventoId,
    formandoId: servicosExecucao.formandoId,
    tipoServico: servicosExecucao.tipoServico,
    fornecedorId: servicosExecucao.fornecedorId,
    quantidade: servicosExecucao.quantidade,
    valorUnitario: servicosExecucao.valorUnitario,
    valorTotal: servicosExecucao.valorTotal,
    fluxo: servicosExecucao.fluxo,
    dataRealizacao: servicosExecucao.dataRealizacao,
    formandoNome: formandos.nome,
    turmaId: eventos.turmaId,
    turmaCodigo: turmas.codigo,
    turmaCursos: turmas.cursos,
    turmaInstituicoes: turmas.instituicoes,
    turmaNumero: turmas.numeroTurma,
    turmaAnos: turmas.anos,
    turmaPeriodos: turmas.periodos,
    fornecedorNome: fornecedores.nome,
  })
  .from(servicosExecucao)
  .leftJoin(formandos, eq(servicosExecucao.formandoId, formandos.id))
  .leftJoin(eventos, eq(servicosExecucao.eventoId, eventos.id))
  .leftJoin(turmas, eq(eventos.turmaId, turmas.id))
  .leftJoin(fornecedores, eq(servicosExecucao.fornecedorId, fornecedores.id))
  .where(
    and(
      or(
        eq(servicosExecucao.tipoServico, 'make_formando'),
        eq(servicosExecucao.tipoServico, 'make_familia')
      ),
      filtros.dataInicio ? gte(servicosExecucao.dataRealizacao, filtros.dataInicio) : undefined,
      filtros.dataFim ? lte(servicosExecucao.dataRealizacao, filtros.dataFim) : undefined,
      filtros.turmaId ? eq(eventos.turmaId, filtros.turmaId) : undefined
    )
  );
  
  const servicos = await query;
  
  // Agrupar por fornecedor e calcular saldo
  const resumoPorFornecedor = new Map<number, {
    fornecedorId: number;
    fornecedorNome: string;
    totalPagar: number; // Make Formando
    totalReceber: number; // Make Família
    saldo: number; // Positivo = receber, Negativo = pagar
    qtdMakeFormando: number;
    qtdMakeFamilia: number;
  }>();
  
  for (const servico of servicos) {
    if (!servico.fornecedorId) continue;
    
    if (!resumoPorFornecedor.has(servico.fornecedorId)) {
      resumoPorFornecedor.set(servico.fornecedorId, {
        fornecedorId: servico.fornecedorId,
        fornecedorNome: servico.fornecedorNome || 'Desconhecido',
        totalPagar: 0,
        totalReceber: 0,
        saldo: 0,
        qtdMakeFormando: 0,
        qtdMakeFamilia: 0,
      });
    }
    
    const resumo = resumoPorFornecedor.get(servico.fornecedorId)!;
    
    if (servico.tipoServico === 'make_formando') {
      resumo.totalPagar += servico.valorTotal || 0;
      resumo.qtdMakeFormando += servico.quantidade || 0;
    } else if (servico.tipoServico === 'make_familia') {
      resumo.totalReceber += servico.valorTotal || 0;
      resumo.qtdMakeFamilia += servico.quantidade || 0;
    }
    
    // Saldo: Receber - Pagar (positivo = fornecedora paga à Super A)
    resumo.saldo = resumo.totalReceber - resumo.totalPagar;
  }
  
  return {
    servicos,
    resumoPorFornecedor: Array.from(resumoPorFornecedor.values()),
  };
}

// Relatório de Cabelo - Comissões a receber
export async function getRelatorioCabelo(filtros: {
  dataInicio?: Date;
  dataFim?: Date;
  turmaId?: number;
}) {
  const db = await getDb();
  if (!db) return { servicos: [], totalComissao: 0 };
  
  let query = db.select({
    id: servicosExecucao.id,
    eventoId: servicosExecucao.eventoId,
    formandoId: servicosExecucao.formandoId,
    tipoServico: servicosExecucao.tipoServico,
    quantidade: servicosExecucao.quantidade,
    valorUnitario: servicosExecucao.valorUnitario,
    valorTotal: servicosExecucao.valorTotal,
    dataRealizacao: servicosExecucao.dataRealizacao,
    formandoNome: formandos.nome,
    turmaId: eventos.turmaId,
    turmaCodigo: turmas.codigo,
    turmaCursos: turmas.cursos,
    turmaInstituicoes: turmas.instituicoes,
    turmaNumero: turmas.numeroTurma,
    turmaAnos: turmas.anos,
    turmaPeriodos: turmas.periodos,
  })
  .from(servicosExecucao)
  .leftJoin(formandos, eq(servicosExecucao.formandoId, formandos.id))
  .leftJoin(eventos, eq(servicosExecucao.eventoId, eventos.id))
  .leftJoin(turmas, eq(eventos.turmaId, turmas.id))
  .where(
    and(
      or(
        eq(servicosExecucao.tipoServico, 'cabelo_simples'),
        eq(servicosExecucao.tipoServico, 'cabelo_combinado')
      ),
      filtros.dataInicio ? gte(servicosExecucao.dataRealizacao, filtros.dataInicio) : undefined,
      filtros.dataFim ? lte(servicosExecucao.dataRealizacao, filtros.dataFim) : undefined,
      filtros.turmaId ? eq(eventos.turmaId, filtros.turmaId) : undefined
    )
  );
  
  const servicos = await query;
  
  // Calcular total de comissão (20% do valor do serviço)
  const totalComissao = servicos.reduce((acc, s) => acc + Math.round((s.valorTotal || 0) * 0.2), 0);
  
  return {
    servicos,
    totalComissao,
  };
}


// ==================== BRIEFING DO EVENTO ====================
export async function listBriefingsByEvento(eventoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(briefingEvento).where(eq(briefingEvento.eventoId, eventoId));
}

export async function getBriefingByFormando(eventoId: number, formandoId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(briefingEvento)
    .where(and(
      eq(briefingEvento.eventoId, eventoId),
      eq(briefingEvento.formandoId, formandoId)
    ));
  return result[0] || null;
}

export async function upsertBriefing(data: {
  eventoId: number;
  formandoId: number;
  grupo?: number;
  horarioFormando?: string;
  horarioFamilia?: string;
  makeFormando?: boolean;
  cabeloFormando?: boolean;
  makeFamilia?: number;
  cabeloFamilia?: number;
  qtdFamilia?: number;
  qtdPets?: number;
  somenteGrupo?: boolean;
  observacao?: string;
  preenchidoPor?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getBriefingByFormando(data.eventoId, data.formandoId);
  
  if (existing) {
    await db.update(briefingEvento)
      .set({
        grupo: data.grupo,
        horarioFormando: data.horarioFormando,
        horarioFamilia: data.horarioFamilia,
        makeFormando: data.makeFormando,
        cabeloFormando: data.cabeloFormando,
        makeFamilia: data.makeFamilia,
        cabeloFamilia: data.cabeloFamilia,
        qtdFamilia: data.qtdFamilia,
        qtdPets: data.qtdPets,
        somenteGrupo: data.somenteGrupo,
        observacao: data.observacao,
        preenchidoPor: data.preenchidoPor,
      })
      .where(eq(briefingEvento.id, existing.id));
    return existing.id;
  } else {
    const result = await db.insert(briefingEvento).values({
      eventoId: data.eventoId,
      formandoId: data.formandoId,
      grupo: data.grupo || 1,
      horarioFormando: data.horarioFormando,
      horarioFamilia: data.horarioFamilia,
      makeFormando: data.makeFormando || false,
      cabeloFormando: data.cabeloFormando || false,
      makeFamilia: data.makeFamilia || 0,
      cabeloFamilia: data.cabeloFamilia || 0,
      qtdFamilia: data.qtdFamilia || 0,
      qtdPets: data.qtdPets || 0,
      somenteGrupo: data.somenteGrupo || false,
      observacao: data.observacao,
      preenchidoPor: data.preenchidoPor,
    });
    return result[0].insertId;
  }
}

export async function deleteBriefing(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(briefingEvento).where(eq(briefingEvento.id, id));
}

// ==================== HORÁRIOS BRIEFING ====================
export async function listHorariosBriefing(eventoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(horariosBriefing)
    .where(and(
      eq(horariosBriefing.eventoId, eventoId),
      eq(horariosBriefing.ativo, true)
    ))
    .orderBy(horariosBriefing.grupo, horariosBriefing.horarioFormando);
}

export async function createHorarioBriefing(data: {
  eventoId: number;
  grupo: number;
  horarioFormando: string;
  horarioFamilia: string;
  capacidade?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(horariosBriefing).values({
    eventoId: data.eventoId,
    grupo: data.grupo,
    horarioFormando: data.horarioFormando,
    horarioFamilia: data.horarioFamilia,
    capacidade: data.capacidade || 10,
  });
  return result[0].insertId;
}

export async function deleteHorarioBriefing(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(horariosBriefing).where(eq(horariosBriefing.id, id));
}

// ==================== ÁREA DO CLIENTE ====================
export async function loginCliente(cpf: string, codigoTurma: string) {
  const db = await getDb();
  if (!db) return null;
  
  // Limpar CPF (remover pontos e traços)
  const cpfLimpo = cpf.replace(/\D/g, '');
  
  // Buscar turma pelo código
  const turmaResult = await db.select().from(turmas).where(eq(turmas.codigo, codigoTurma));
  if (turmaResult.length === 0) return null;
  
  const turma = turmaResult[0];
  
  // Buscar formando pelo CPF na turma
  const formandoResult = await db.select().from(formandos)
    .where(and(
      eq(formandos.turmaId, turma.id),
      eq(formandos.cpf, cpfLimpo)
    ));
  
  if (formandoResult.length === 0) return null;
  
  return {
    ...formandoResult[0],
    turma: {
      id: turma.id,
      codigo: turma.codigo,
    }
  };
}


// ==================== BRIEFING GRUPO ====================

export async function getBriefingGruposByEvento(eventoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(briefingGrupo).where(eq(briefingGrupo.eventoId, eventoId)).orderBy(briefingGrupo.numero);
}

export async function getBriefingGruposByTurmaETipo(turmaId: number, tipoEvento: string) {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar todos os eventos da turma com o tipo especificado
  const eventosIds = await db
    .select({ id: eventos.id })
    .from(eventos)
    .where(and(eq(eventos.turmaId, turmaId), sql`${eventos.tipoEvento} = ${tipoEvento}`));
  
  if (eventosIds.length === 0) return [];
  
  // Buscar todos os grupos desses eventos
  const ids = eventosIds.map(e => e.id);
  return db
    .select()
    .from(briefingGrupo)
    .where(inArray(briefingGrupo.eventoId, ids))
    .orderBy(briefingGrupo.numero);
}

export async function createBriefingGrupo(data: InsertBriefingGrupo) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(briefingGrupo).values(data);
  return result[0].insertId;
}

export async function updateBriefingGrupo(id: number, data: Partial<InsertBriefingGrupo>) {
  const db = await getDb();
  if (!db) return false;
  await db.update(briefingGrupo).set(data).where(eq(briefingGrupo.id, id));
  return true;
}

export async function deleteBriefingGrupo(id: number) {
  const db = await getDb();
  if (!db) return false;
  // Primeiro remove os formandos do grupo
  await db.delete(briefingFormando).where(eq(briefingFormando.grupoId, id));
  // Depois remove o grupo
  await db.delete(briefingGrupo).where(eq(briefingGrupo.id, id));
  return true;
}

// Buscar briefings existentes por turma (eventos que já têm grupos)
export async function getBriefingsExistentesByTurma(turmaId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar eventos da turma que têm grupos de briefing
  const result = await db
    .select({
      eventoId: briefingGrupo.eventoId,
      tipoEvento: eventos.tipoEvento,
      dataEvento: eventos.dataEvento,
      qtdGrupos: sql<number>`COUNT(DISTINCT ${briefingGrupo.id})`,
      qtdFormandos: sql<number>`COUNT(DISTINCT ${briefingFormando.id})`,
    })
    .from(briefingGrupo)
    .innerJoin(eventos, eq(briefingGrupo.eventoId, eventos.id))
    .leftJoin(briefingFormando, eq(briefingFormando.eventoId, briefingGrupo.eventoId))
    .where(eq(eventos.turmaId, turmaId))
    .groupBy(briefingGrupo.eventoId, eventos.tipoEvento, eventos.dataEvento);
  
  return result;
}

// ==================== BRIEFING FORMANDO ====================

export async function getBriefingFormandosByGrupo(grupoId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: briefingFormando.id,
      grupoId: briefingFormando.grupoId,
      eventoId: briefingFormando.eventoId,
      formandoId: briefingFormando.formandoId,
      ordem: briefingFormando.ordem,
      horarioFamiliaSemServico: briefingFormando.horarioFamiliaSemServico,
      horarioFamiliaComServico: briefingFormando.horarioFamiliaComServico,
      makeFormando: briefingFormando.makeFormando,
      cabeloFormando: briefingFormando.cabeloFormando,
      makeFamilia: briefingFormando.makeFamilia,
      cabeloFamilia: briefingFormando.cabeloFamilia,
      qtdMakeFamilia: briefingFormando.qtdMakeFamilia,
      qtdCabeloSimples: briefingFormando.qtdCabeloSimples,
      qtdCabeloCombinado: briefingFormando.qtdCabeloCombinado,
      qtdCabeloFamilia: briefingFormando.qtdCabeloFamilia,
      qtdFamilia: briefingFormando.qtdFamilia,
      qtdPets: briefingFormando.qtdPets,
      peso: briefingFormando.peso,
      altura: briefingFormando.altura,
      somenteGrupo: briefingFormando.somenteGrupo,
      tamanhoBeca: briefingFormando.tamanhoBeca,
      observacao: briefingFormando.observacao,
      preenchidoPor: briefingFormando.preenchidoPor,
      preenchidoEm: briefingFormando.preenchidoEm,
      // Campos de abordagem (dados executados)
      abordagemPacote: briefingFormando.abordagemPacote,
      abordagemMakeFormando: briefingFormando.abordagemMakeFormando,
      abordagemCabeloFormando: briefingFormando.abordagemCabeloFormando,
      abordagemQtdCabeloSimples: briefingFormando.abordagemQtdCabeloSimples,
      abordagemQtdCabeloCombinado: briefingFormando.abordagemQtdCabeloCombinado,
      abordagemQtdMakeFamilia: briefingFormando.abordagemQtdMakeFamilia,
      abordagemQtdFamilia: briefingFormando.abordagemQtdFamilia,
      abordagemQtdPets: briefingFormando.abordagemQtdPets,
      abordagemPreenchidoPor: briefingFormando.abordagemPreenchidoPor,
      abordagemPreenchidoEm: briefingFormando.abordagemPreenchidoEm,
      formandoNome: formandos.nome,
      formandoCpf: formandos.cpf,
      formandoTelefone: formandos.telefone,
      formandoPacote: formandos.pacote,
    })
    .from(briefingFormando)
    .leftJoin(formandos, eq(briefingFormando.formandoId, formandos.id))
    .where(eq(briefingFormando.grupoId, grupoId))
    .orderBy(briefingFormando.ordem);
  
  return result;
}

export async function getBriefingFormandosByEvento(eventoId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: briefingFormando.id,
      grupoId: briefingFormando.grupoId,
      eventoId: briefingFormando.eventoId,
      formandoId: briefingFormando.formandoId,
      ordem: briefingFormando.ordem,
      horarioFamiliaSemServico: briefingFormando.horarioFamiliaSemServico,
      horarioFamiliaComServico: briefingFormando.horarioFamiliaComServico,
      makeFormando: briefingFormando.makeFormando,
      cabeloFormando: briefingFormando.cabeloFormando,
      makeFamilia: briefingFormando.makeFamilia,
      cabeloFamilia: briefingFormando.cabeloFamilia,
      qtdMakeFamilia: briefingFormando.qtdMakeFamilia,
      qtdCabeloSimples: briefingFormando.qtdCabeloSimples,
      qtdCabeloCombinado: briefingFormando.qtdCabeloCombinado,
      qtdCabeloFamilia: briefingFormando.qtdCabeloFamilia,
      qtdFamilia: briefingFormando.qtdFamilia,
      qtdPets: briefingFormando.qtdPets,
      peso: briefingFormando.peso,
      altura: briefingFormando.altura,
      somenteGrupo: briefingFormando.somenteGrupo,
      tamanhoBeca: briefingFormando.tamanhoBeca,
      observacao: briefingFormando.observacao,
      preenchidoPor: briefingFormando.preenchidoPor,
      preenchidoEm: briefingFormando.preenchidoEm,
      // Campos de abordagem (dados executados)
      abordagemPacote: briefingFormando.abordagemPacote,
      abordagemMakeFormando: briefingFormando.abordagemMakeFormando,
      abordagemCabeloFormando: briefingFormando.abordagemCabeloFormando,
      abordagemQtdCabeloSimples: briefingFormando.abordagemQtdCabeloSimples,
      abordagemQtdCabeloCombinado: briefingFormando.abordagemQtdCabeloCombinado,
      abordagemQtdMakeFamilia: briefingFormando.abordagemQtdMakeFamilia,
      abordagemQtdFamilia: briefingFormando.abordagemQtdFamilia,
      abordagemQtdPets: briefingFormando.abordagemQtdPets,
      abordagemPreenchidoPor: briefingFormando.abordagemPreenchidoPor,
      abordagemPreenchidoEm: briefingFormando.abordagemPreenchidoEm,
      formandoNome: formandos.nome,
      formandoCpf: formandos.cpf,
      formandoTelefone: formandos.telefone,
      formandoPacote: formandos.pacote,
    })
    .from(briefingFormando)
    .leftJoin(formandos, eq(briefingFormando.formandoId, formandos.id))
    .where(eq(briefingFormando.eventoId, eventoId))
    .orderBy(briefingFormando.grupoId, briefingFormando.ordem);
  
  return result;
}

export async function getBriefingFormandosByTurmaETipo(turmaId: number, tipoEvento: string) {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar todos os eventos da turma com o tipo especificado
  const eventosIds = await db
    .select({ id: eventos.id })
    .from(eventos)
    .where(and(eq(eventos.turmaId, turmaId), sql`${eventos.tipoEvento} = ${tipoEvento}`));
  
  if (eventosIds.length === 0) return [];
  
  // Buscar todos os formandos desses eventos
  const ids = eventosIds.map(e => e.id);
  const result = await db
    .select({
      id: briefingFormando.id,
      grupoId: briefingFormando.grupoId,
      eventoId: briefingFormando.eventoId,
      formandoId: briefingFormando.formandoId,
      ordem: briefingFormando.ordem,
      horarioFamiliaSemServico: briefingFormando.horarioFamiliaSemServico,
      horarioFamiliaComServico: briefingFormando.horarioFamiliaComServico,
      makeFormando: briefingFormando.makeFormando,
      cabeloFormando: briefingFormando.cabeloFormando,
      makeFamilia: briefingFormando.makeFamilia,
      cabeloFamilia: briefingFormando.cabeloFamilia,
      qtdMakeFamilia: briefingFormando.qtdMakeFamilia,
      qtdCabeloSimples: briefingFormando.qtdCabeloSimples,
      qtdCabeloCombinado: briefingFormando.qtdCabeloCombinado,
      qtdCabeloFamilia: briefingFormando.qtdCabeloFamilia,
      qtdFamilia: briefingFormando.qtdFamilia,
      qtdPets: briefingFormando.qtdPets,
      peso: briefingFormando.peso,
      altura: briefingFormando.altura,
      somenteGrupo: briefingFormando.somenteGrupo,
      tamanhoBeca: briefingFormando.tamanhoBeca,
      observacao: briefingFormando.observacao,
      preenchidoPor: briefingFormando.preenchidoPor,
      preenchidoEm: briefingFormando.preenchidoEm,
      // Campos de abordagem (dados executados)
      abordagemPacote: briefingFormando.abordagemPacote,
      abordagemMakeFormando: briefingFormando.abordagemMakeFormando,
      abordagemCabeloFormando: briefingFormando.abordagemCabeloFormando,
      abordagemQtdCabeloSimples: briefingFormando.abordagemQtdCabeloSimples,
      abordagemQtdCabeloCombinado: briefingFormando.abordagemQtdCabeloCombinado,
      abordagemQtdMakeFamilia: briefingFormando.abordagemQtdMakeFamilia,
      abordagemQtdFamilia: briefingFormando.abordagemQtdFamilia,
      abordagemQtdPets: briefingFormando.abordagemQtdPets,
      abordagemPreenchidoPor: briefingFormando.abordagemPreenchidoPor,
      abordagemPreenchidoEm: briefingFormando.abordagemPreenchidoEm,
      formandoNome: formandos.nome,
      formandoCpf: formandos.cpf,
      formandoTelefone: formandos.telefone,
      formandoPacote: formandos.pacote,
    })
    .from(briefingFormando)
    .leftJoin(formandos, eq(briefingFormando.formandoId, formandos.id))
    .where(inArray(briefingFormando.eventoId, ids))
    .orderBy(briefingFormando.grupoId, briefingFormando.ordem);
  
  return result;
}

export async function createBriefingFormando(data: InsertBriefingFormando) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(briefingFormando).values(data);
  return result[0].insertId;
}

export async function updateBriefingFormando(id: number, data: Partial<InsertBriefingFormando>) {
  const db = await getDb();
  if (!db) return false;
  await db.update(briefingFormando).set(data).where(eq(briefingFormando.id, id));
  return true;
}

export async function deleteBriefingFormando(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(briefingFormando).where(eq(briefingFormando.id, id));
  return true;
}

export async function updateBriefingFormandoAbordagem(id: number, data: Partial<InsertBriefingFormando>) {
  const db = await getDb();
  if (!db) return false;
  await db.update(briefingFormando).set(data).where(eq(briefingFormando.id, id));
  return true;
}

export async function getNextOrdemInGrupo(grupoId: number) {
  const db = await getDb();
  if (!db) return 1;
  
  const result = await db
    .select({ maxOrdem: sql<number>`MAX(${briefingFormando.ordem})` })
    .from(briefingFormando)
    .where(eq(briefingFormando.grupoId, grupoId));
  
  return (result[0]?.maxOrdem || 0) + 1;
}

export async function countFormandosInGrupo(grupoId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(briefingFormando)
    .where(eq(briefingFormando.grupoId, grupoId));
  
  return result[0]?.count || 0;
}

// Buscar formando pelo nome exato
export async function getFormandoByNomeExato(nome: string, turmaId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(formandos)
    .where(and(
      eq(formandos.nome, nome),
      eq(formandos.turmaId, turmaId)
    ))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

// Importar briefing completo (grupos + formandos)
export async function importarBriefingCompleto(data: {
  eventoId: number;
  turmaId: number;
  grupos: Array<{
    numero: number;
    dataGrupo: Date;
    horarioFormandos: string;
    limiteFormandos: number;
    formandos: Array<{
      nomeFormando: string;
      horarioFamiliaSemServico: string;
      maquiagemFormando: boolean;
      maquiagemFamilia: number;
      cabeloSimples: number;
      cabeloCombinado: number;
      horarioFamiliaComServico: string;
      qtdFamilia: number;
      qtdPets: number;
      somenteGrupo: boolean;
    }>;
  }>;
}) {
  console.log('[BRIEFING IMPORT] Iniciando importação:', {
    eventoId: data.eventoId,
    turmaId: data.turmaId,
    totalGrupos: data.grupos.length
  });
  
  const db = await getDb();
  if (!db) {
    console.error('[BRIEFING IMPORT] Banco de dados indisponível');
    return { sucesso: false, erro: 'Banco de dados indisponível' };
  }
  
  const resultado = {
    sucesso: true,
    gruposCriados: 0,
    formandosVinculados: 0,
    formandosNaoEncontrados: [] as string[],
    erros: [] as string[],
  };
  
  try {
    // Processar cada grupo
    for (const grupo of data.grupos) {
      console.log('[BRIEFING IMPORT] Processando grupo:', {
        numero: grupo.numero,
        dataGrupo: grupo.dataGrupo,
        totalFormandos: grupo.formandos.length
      });
      // Criar grupo
      const grupoResult = await db.insert(briefingGrupo).values({
        eventoId: data.eventoId,
        numero: grupo.numero,
        dataGrupo: grupo.dataGrupo,
        horarioFormandos: grupo.horarioFormandos,
        limiteFormandos: grupo.limiteFormandos,
        ativo: true,
      });
      
      const grupoId = Number(grupoResult[0].insertId);
      resultado.gruposCriados++;
      console.log('[BRIEFING IMPORT] Grupo criado com ID:', grupoId);
      
      // Processar formandos do grupo
      let ordem = 1;
      for (const formandoData of grupo.formandos) {
        console.log('[BRIEFING IMPORT] Processando formando:', formandoData.nomeFormando);
        // Buscar formando pelo nome
        let formando = await getFormandoByNomeExato(formandoData.nomeFormando, data.turmaId);
        
        // Se formando não existe, criar automaticamente
        if (!formando) {
          try {
            // Gerar código do formando automaticamente
            const turma = await getTurmaById(data.turmaId);
            if (!turma) {
              resultado.erros.push(`Turma ${data.turmaId} não encontrada`);
              continue;
            }
            
            const codigoFormando = `${turma.codigo}-${resultado.formandosVinculados + 1}`;
            
            // Criar formando com apenas os campos obrigatórios
            const formandoId = await createFormando({
              turmaId: data.turmaId,
              codigoFormando,
              nome: formandoData.nomeFormando,
            });
            
            // Buscar formando recém-criado
            formando = await getFormandoById(formandoId);
            
            if (!formando) {
              resultado.erros.push(`Erro ao criar formando: ${formandoData.nomeFormando}`);
              continue;
            }
          } catch (error: any) {
            resultado.erros.push(`Erro ao criar formando ${formandoData.nomeFormando}: ${error.message}`);
            continue;
          }
        }
        
        // Vincular formando ao grupo
        await db.insert(briefingFormando).values({
          grupoId,
          eventoId: data.eventoId,
          formandoId: formando.id,
          ordem,
          horarioFamiliaSemServico: formandoData.horarioFamiliaSemServico || null,
          horarioFamiliaComServico: formandoData.horarioFamiliaComServico || null,
          makeFormando: formandoData.maquiagemFormando,
          qtdMakeFamilia: formandoData.maquiagemFamilia,
          qtdCabeloSimples: formandoData.cabeloSimples,
          qtdCabeloCombinado: formandoData.cabeloCombinado,
          qtdFamilia: formandoData.qtdFamilia,
          qtdPets: formandoData.qtdPets,
          somenteGrupo: formandoData.somenteGrupo,
        });
        
        resultado.formandosVinculados++;
        ordem++;
        console.log('[BRIEFING IMPORT] Formando vinculado ao grupo:', formandoData.nomeFormando);
      }
    }
    
    console.log('[BRIEFING IMPORT] Importação concluída:', resultado);
    return resultado;
  } catch (error: any) {
    console.error('[BRIEFING IMPORT] Erro durante importação:', error);
    console.error('[BRIEFING IMPORT] Stack trace:', error.stack);
    return {
      sucesso: false,
      erro: error.message || 'Erro ao importar briefing',
      gruposCriados: resultado.gruposCriados,
      formandosVinculados: resultado.formandosVinculados,
      formandosNaoEncontrados: resultado.formandosNaoEncontrados,
      erros: resultado.erros,
    };
  }
}

// Excluir briefing completo (todos os grupos e formandos de um evento)
export async function excluirBriefingCompleto(eventoId: number, turmaId: number) {
  const db = await getDb();
  if (!db) throw new Error('Banco de dados indisponível');
  
  try {
    // Excluir todos os formandos vinculados aos grupos deste evento
    await db.delete(briefingFormando).where(eq(briefingFormando.eventoId, eventoId));
    
    // Excluir todos os grupos deste evento
    await db.delete(briefingGrupo).where(eq(briefingGrupo.eventoId, eventoId));
    
    return { success: true };
  } catch (error: any) {
    throw new Error(`Erro ao excluir briefing: ${error.message}`);
  }
}

// ==================== DESPESAS V2 ====================

// Gerar próximo número de CI no formato 001/2026
export async function getNextNumeroCiV2() {
  const db = await getDb();
  if (!db) return "001/" + new Date().getFullYear();
  
  const anoAtual = new Date().getFullYear();
  
  // Buscar ou criar sequência para o ano atual
  const sequencia = await db
    .select()
    .from(sequenciaCi)
    .where(eq(sequenciaCi.ano, anoAtual))
    .limit(1);
  
  let proximoNumero = 1;
  
  if (sequencia.length === 0) {
    // Criar nova sequência para o ano
    await db.insert(sequenciaCi).values({ ano: anoAtual, ultimoNumero: 1 });
  } else {
    proximoNumero = sequencia[0].ultimoNumero + 1;
    await db
      .update(sequenciaCi)
      .set({ ultimoNumero: proximoNumero })
      .where(eq(sequenciaCi.ano, anoAtual));
  }
  
  return `${String(proximoNumero).padStart(3, '0')}/${anoAtual}`;
}

// Listar todas as despesas V2 com dados relacionados
export async function listDespesasV2() {
  const db = await getDb();
  if (!db) return [];
  
  const despesas = await db.select().from(despesasV2).orderBy(desc(despesasV2.createdAt));
  
  // Buscar turmas vinculadas para cada despesa com dados completos
  const despesasComTurmas = await Promise.all(
    despesas.map(async (despesa) => {
      const turmasVinculadasRaw = await db
        .select()
        .from(despesasV2Turmas)
        .where(eq(despesasV2Turmas.despesaId, despesa.id));
      
      // Buscar dados completos de cada turma
      const turmasVinculadas = await Promise.all(
        turmasVinculadasRaw.map(async (tv) => {
          const [turma] = await db
            .select()
            .from(turmas)
            .where(eq(turmas.id, tv.turmaId))
            .limit(1);
          
          return {
            ...tv,
            turma, // Incluir dados completos da turma
          };
        })
      );
      
      const datasRealizacao = await db
        .select()
        .from(despesasV2Datas)
        .where(eq(despesasV2Datas.despesaId, despesa.id));
      
      const anexos = await db
        .select()
        .from(despesasV2Anexos)
        .where(eq(despesasV2Anexos.despesaId, despesa.id));
      
      return {
        ...despesa,
        turmasVinculadas,
        datasRealizacao,
        anexos,
      };
    })
  );
  
  return despesasComTurmas;
}

// Buscar despesa V2 por ID com dados relacionados
export async function getDespesaV2ById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const despesa = await db
    .select()
    .from(despesasV2)
    .where(eq(despesasV2.id, id))
    .limit(1);
  
  if (despesa.length === 0) return null;
  
  // Buscar turmas vinculadas
  const turmasVinculadas = await db
    .select()
    .from(despesasV2Turmas)
    .where(eq(despesasV2Turmas.despesaId, id));
  
  // Buscar datas de realização
  const datasRealizacao = await db
    .select()
    .from(despesasV2Datas)
    .where(eq(despesasV2Datas.despesaId, id));
  
  // Buscar anexos
  const anexos = await db
    .select()
    .from(despesasV2Anexos)
    .where(eq(despesasV2Anexos.despesaId, id));
  
  // Buscar histórico
  const historico = await db
    .select()
    .from(despesasV2Historico)
    .where(eq(despesasV2Historico.despesaId, id))
    .orderBy(desc(despesasV2Historico.createdAt));
  
  return {
    ...despesa[0],
    turmas: turmasVinculadas,
    datasRealizacao,
    anexos,
    historico
  };
}

// Criar despesa V2
export async function createDespesaV2(data: {
  numeroCi: string;
  tipoDespesa: 'operacional' | 'administrativa';
  mesServico: string;
  setorSolicitante: 'estudio' | 'fotografia' | 'becas';
  fornecedorId: number;
  tipoServicoCompra?: string;
  detalhamento: string;
  eReembolso: boolean;
  valorTotal: number;
  tipoPagamento: 'pix' | 'cartao' | 'boleto' | 'dinheiro';
  dadosPagamento: string;
  tipoComprovanteFiscal?: 'contrato' | 'nota_fiscal' | 'rpa';
  dataLimitePagamento?: Date;
  local?: string;
  criadoPorId: number;
  criadoPorNome?: string;
  turmas?: { turmaId: number; tipoEvento?: string }[];
  datasRealizacao?: Date[];
}) {
  const db = await getDb();
  if (!db) return null;
  
  const { turmas: turmasData, datasRealizacao, ...despesaData } = data;
  
  const result = await db.insert(despesasV2).values({
    ...despesaData,
    mesServico: despesaData.mesServico as any,
    status: 'aguardando_aprovacao_gestor'
  });
  
  const despesaId = Number(result[0].insertId);
  
  // Inserir turmas vinculadas
  if (turmasData && turmasData.length > 0) {
    for (const turma of turmasData) {
      await db.insert(despesasV2Turmas).values({
        despesaId,
        turmaId: turma.turmaId,
        tipoEvento: turma.tipoEvento
      });
    }
  }
  
  // Inserir datas de realização
  if (datasRealizacao && datasRealizacao.length > 0) {
    for (const dataRealizacao of datasRealizacao) {
      await db.insert(despesasV2Datas).values({
        despesaId,
        dataRealizacao
      });
    }
  }
  
  // Registrar no histórico
  await db.insert(despesasV2Historico).values({
    despesaId,
    acao: 'criacao',
    statusNovo: 'aguardando_aprovacao_gestor',
    usuarioId: data.criadoPorId,
    usuarioNome: data.criadoPorNome
  });
  
  return despesaId;
}

// Atualizar despesa V2
export async function updateDespesaV2(id: number, data: Partial<InsertDespesaV2> & {
  turmas?: { turmaId: number; tipoEvento?: string }[];
  datasRealizacao?: Date[];
}) {
  const db = await getDb();
  if (!db) return false;
  
  const { turmas: turmasData, datasRealizacao, ...despesaData } = data;
  
  // Atualizar dados da despesa
  if (Object.keys(despesaData).length > 0) {
    await db
      .update(despesasV2)
      .set(despesaData)
      .where(eq(despesasV2.id, id));
  }
  
  // Atualizar turmas se fornecidas
  if (turmasData !== undefined) {
    await db.delete(despesasV2Turmas).where(eq(despesasV2Turmas.despesaId, id));
    for (const turma of turmasData) {
      await db.insert(despesasV2Turmas).values({
        despesaId: id,
        turmaId: turma.turmaId,
        tipoEvento: turma.tipoEvento
      });
    }
  }
  
  // Atualizar datas se fornecidas
  if (datasRealizacao !== undefined) {
    await db.delete(despesasV2Datas).where(eq(despesasV2Datas.despesaId, id));
    for (const dataRealizacao of datasRealizacao) {
      await db.insert(despesasV2Datas).values({
        despesaId: id,
        dataRealizacao
      });
    }
  }
  
  return true;
}

// Aprovar despesa (Gestor)
export async function aprovarDespesaGestor(despesaId: number, usuarioId: number, usuarioNome?: string) {
  const db = await getDb();
  if (!db) return false;
  
  const despesa = await db
    .select()
    .from(despesasV2)
    .where(eq(despesasV2.id, despesaId))
    .limit(1);
  
  if (despesa.length === 0) return false;
  
  const statusAnterior = despesa[0].status;
  
  await db
    .update(despesasV2)
    .set({ status: 'aguardando_aprovacao_gestor_geral' })
    .where(eq(despesasV2.id, despesaId));
  
  await db.insert(despesasV2Historico).values({
    despesaId,
    acao: 'aprovacao_gestor',
    statusAnterior,
    statusNovo: 'aguardando_aprovacao_gestor_geral',
    usuarioId,
    usuarioNome
  });
  
  return true;
}

// Aprovar despesa (Gestor Geral)
export async function aprovarDespesaGestorGeral(despesaId: number, usuarioId: number, usuarioNome?: string) {
  const db = await getDb();
  if (!db) return false;
  
  const despesa = await db
    .select()
    .from(despesasV2)
    .where(eq(despesasV2.id, despesaId))
    .limit(1);
  
  if (despesa.length === 0) return false;
  
  const statusAnterior = despesa[0].status;
  
  await db
    .update(despesasV2)
    .set({ status: 'aprovado_gestor_geral' })
    .where(eq(despesasV2.id, despesaId));
  
  await db.insert(despesasV2Historico).values({
    despesaId,
    acao: 'aprovacao_gestor_geral',
    statusAnterior,
    statusNovo: 'aprovado_gestor_geral',
    usuarioId,
    usuarioNome
  });
  
  return true;
}

// Rejeitar despesa
export async function rejeitarDespesa(
  despesaId: number, 
  tipo: 'gestor' | 'gestor_geral',
  justificativa: string,
  usuarioId: number, 
  usuarioNome?: string
) {
  const db = await getDb();
  if (!db) return false;
  
  const despesa = await db
    .select()
    .from(despesasV2)
    .where(eq(despesasV2.id, despesaId))
    .limit(1);
  
  if (despesa.length === 0) return false;
  
  const statusAnterior = despesa[0].status;
  // Quando rejeitado (por gestor ou gestor geral), sempre volta para aguardando_aprovacao_gestor
  const novoStatus = 'aguardando_aprovacao_gestor';
  
  await db
    .update(despesasV2)
    .set({ status: novoStatus as any })
    .where(eq(despesasV2.id, despesaId));
  
  await db.insert(despesasV2Historico).values({
    despesaId,
    acao: tipo === 'gestor' ? 'rejeicao_gestor' : 'rejeicao_gestor_geral',
    statusAnterior,
    statusNovo: novoStatus,
    justificativa,
    usuarioId,
    usuarioNome
  });
  
  return true;
}

// Liquidar despesa
export async function liquidarDespesa(
  despesaId: number, 
  dataLiquidacao: Date,
  comprovanteUrl: string | null,
  usuarioId: number, 
  usuarioNome?: string
) {
  const db = await getDb();
  if (!db) return false;
  
  const despesa = await db
    .select()
    .from(despesasV2)
    .where(eq(despesasV2.id, despesaId))
    .limit(1);
  
  if (despesa.length === 0) return false;
  
  const statusAnterior = despesa[0].status;
  
  await db
    .update(despesasV2)
    .set({ 
      status: 'liquidado',
      dataLiquidacao,
      comprovanteUrl
    })
    .where(eq(despesasV2.id, despesaId));
  
  await db.insert(despesasV2Historico).values({
    despesaId,
    acao: 'liquidacao',
    statusAnterior,
    statusNovo: 'liquidado',
    usuarioId,
    usuarioNome
  });
  
  return true;
}

// Adicionar anexo à despesa V2
export async function createAnexoDespesaV2(data: InsertDespesaV2Anexo) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(despesasV2Anexos).values(data);
  return Number(result[0].insertId);
}

// Listar anexos da despesa V2
export async function listAnexosDespesaV2(despesaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(despesasV2Anexos)
    .where(eq(despesasV2Anexos.despesaId, despesaId));
}

// Deletar anexo da despesa V2
export async function deleteAnexoDespesaV2(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(despesasV2Anexos).where(eq(despesasV2Anexos.id, id));
}

// Listar histórico da despesa V2
export async function listHistoricoDespesaV2(despesaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(despesasV2Historico)
    .where(eq(despesasV2Historico.despesaId, despesaId))
    .orderBy(desc(despesasV2Historico.createdAt));
}

// Listar despesas V2 com filtros
export async function listDespesasV2ComFiltros(filtros: {
  turmaId?: number;
  dataInicio?: Date;
  dataFim?: Date;
  status?: string;
  tipoEvento?: string;
  fornecedorId?: number;
  tipoServicoCompra?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(despesasV2);
  
  const conditions: any[] = [];
  
  if (filtros.status) {
    conditions.push(eq(despesasV2.status, filtros.status as any));
  }
  
  if (filtros.fornecedorId) {
    conditions.push(eq(despesasV2.fornecedorId, filtros.fornecedorId));
  }
  
  if (filtros.tipoServicoCompra) {
    conditions.push(eq(despesasV2.tipoServicoCompra, filtros.tipoServicoCompra));
  }
  
  if (filtros.dataInicio) {
    conditions.push(gte(despesasV2.createdAt, filtros.dataInicio));
  }
  
  if (filtros.dataFim) {
    conditions.push(lte(despesasV2.createdAt, filtros.dataFim));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  const despesas = await query.orderBy(desc(despesasV2.createdAt));
  
  // Se houver filtro por turma ou tipo de evento, filtrar após busca
  if (filtros.turmaId || filtros.tipoEvento) {
    const despesasComTurmas = await Promise.all(
      despesas.map(async (d) => {
        const turmasVinculadas = await db
          .select()
          .from(despesasV2Turmas)
          .where(eq(despesasV2Turmas.despesaId, d.id));
        return { ...d, turmas: turmasVinculadas };
      })
    );
    
    return despesasComTurmas.filter(d => {
      if (filtros.turmaId && !d.turmas.some(t => t.turmaId === filtros.turmaId)) {
        return false;
      }
      if (filtros.tipoEvento && !d.turmas.some(t => t.tipoEvento === filtros.tipoEvento)) {
        return false;
      }
      return true;
    });
  }
  
  return despesas;
}

// Buscar turmas vinculadas a uma despesa
export async function getTurmasDespesaV2(despesaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(despesasV2Turmas)
    .where(eq(despesasV2Turmas.despesaId, despesaId));
}

// Buscar datas de realização de uma despesa
export async function getDatasDespesaV2(despesaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(despesasV2Datas)
    .where(eq(despesasV2Datas.despesaId, despesaId));
}

// Deletar despesa V2 e dados relacionados
export async function deleteDespesaV2(id: number) {
  const db = await getDb();
  if (!db) return false;
  
  await db.delete(despesasV2Turmas).where(eq(despesasV2Turmas.despesaId, id));
  await db.delete(despesasV2Datas).where(eq(despesasV2Datas.despesaId, id));
  await db.delete(despesasV2Anexos).where(eq(despesasV2Anexos.despesaId, id));
  await db.delete(despesasV2Historico).where(eq(despesasV2Historico.despesaId, id));
  await db.delete(despesasV2).where(eq(despesasV2.id, id));
  
  return true;
}

// ==================== REUNIÕES ATENDIMENTO ====================
export async function getAllReunioes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reunioes).orderBy(desc(reunioes.data));
}

export async function getReuniaoById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(reunioes).where(eq(reunioes.id, id));
  return result || null;
}

export async function createReuniao(data: {
  turmaId: number;
  data: string;
  horario: string;
  tiposEvento: number[];
  tipoReuniao: "Presencial" | "Online";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Converter string YYYY-MM-DD para Date considerando timezone GMT-3 (Recife-PE)
  // Adiciona 'T12:00:00-03:00' para garantir que a data seja interpretada no timezone correto
  const dataComTimezone = `${data.data}T12:00:00-03:00`;
  
  const insertData: InsertReuniao = {
    turmaId: data.turmaId,
    data: new Date(dataComTimezone),
    horario: data.horario,
    tiposEvento: JSON.stringify(data.tiposEvento),
    tipoReuniao: data.tipoReuniao,
  };
  
  const result = await db.insert(reunioes).values(insertData);
  return result[0].insertId;
}

export async function updateReuniao(id: number, data: Partial<{
  quantidadeReunioes: number;
  dataResumo: string;
  alinhamento: boolean;
  dataBriefing: string;
}>) {
  const db = await getDb();
  if (!db) return false;
  
  // Converter strings de data para Date considerando timezone GMT-3 (Recife-PE)
  const updateData: any = { ...data };
  if (data.dataResumo) {
    const dataResumoComTimezone = `${data.dataResumo}T12:00:00-03:00`;
    updateData.dataResumo = new Date(dataResumoComTimezone);
  }
  if (data.dataBriefing) {
    const dataBriefingComTimezone = `${data.dataBriefing}T12:00:00-03:00`;
    updateData.dataBriefing = new Date(dataBriefingComTimezone);
  }
  
  await db.update(reunioes).set(updateData).where(eq(reunioes.id, id));
  return true;
}

export async function deleteReuniao(id: number) {
  const db = await getDb();
  if (!db) return false;
  
  await db.delete(reunioes).where(eq(reunioes.id, id));
  return true;
}

// ==================== TURMAS - OBSERVAÇÕES BECA ====================
export async function updateTurmaObservacoesBeca(turmaId: number, observacoesBeca: string) {
  const mysql = await import('mysql2/promise');
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  
  try {
    await connection.execute(
      'UPDATE turmas SET observacoesBeca = ? WHERE id = ?',
      [observacoesBeca, turmaId]
    );
  } finally {
    await connection.end();
  }
}

// ==================== HISTÓRICO DE OBSERVAÇÕES ====================
export async function createHistoricoObservacao(data: InsertHistoricoObservacao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(historicoObservacoes).values(data);
  return result[0].insertId;
}

export async function listHistoricoObservacoes(filters?: {
  eventoId?: number;
  userId?: number;
  dataInicio?: Date;
  dataFim?: Date;
}) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db
    .select({
      id: historicoObservacoes.id,
      eventoId: historicoObservacoes.eventoId,
      userId: historicoObservacoes.userId,
      observacao: historicoObservacoes.observacao,
      createdAt: historicoObservacoes.createdAt,
      // Join com eventos para pegar informações do evento
      evento: {
        id: eventos.id,
        turmaId: eventos.turmaId,
        tipoEvento: eventos.tipoEvento,
        dataEvento: eventos.dataEvento,
      },
      // Join com users para pegar nome do usuário
      usuario: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(historicoObservacoes)
    .leftJoin(eventos, eq(historicoObservacoes.eventoId, eventos.id))
    .leftJoin(users, eq(historicoObservacoes.userId, users.id))
    .orderBy(desc(historicoObservacoes.createdAt));
  
  // Aplicar filtros se fornecidos
  const conditions = [];
  if (filters?.eventoId) {
    conditions.push(eq(historicoObservacoes.eventoId, filters.eventoId));
  }
  if (filters?.userId) {
    conditions.push(eq(historicoObservacoes.userId, filters.userId));
  }
  if (filters?.dataInicio) {
    conditions.push(gte(historicoObservacoes.createdAt, filters.dataInicio));
  }
  if (filters?.dataFim) {
    conditions.push(lte(historicoObservacoes.createdAt, filters.dataFim));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return await query;
}

// ==================== PERMISSÕES RELATÓRIOS ====================
export async function getPermissoesRelatoriosByRole(role: string) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(permissoesRelatorios)
    .where(eq(permissoesRelatorios.role, role as any));
  
  return result;
}

// ==================== PERMISSÕES CONFIGURAÇÕES ====================
export async function getAllPermissoesConfiguracoes() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(permissoesConfiguracoes);
  
  return result;
}

export async function getPermissoesConfiguracoesByRole(role: string) {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar o tipo de usuário pelo nome (role)
  const [tipoUsuario] = await db.select().from(tiposUsuario).where(eq(tiposUsuario.nome, role));
  
  if (!tipoUsuario) {
    // Se não encontrar tipo de usuário, retornar array vazio
    return [];
  }
  
  // Buscar permissões pelo tipoUsuarioId
  const result = await db
    .select()
    .from(permissoesConfiguracoes)
    .where(eq(permissoesConfiguracoes.tipoUsuarioId, tipoUsuario.id));
  
  return result;
}

export async function upsertPermissaoConfiguracao(data: { role: string; aba: string; visualizar: boolean; inserir: boolean; excluir: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  // Função para normalizar string removendo acentos
  const normalizeSlug = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '_');
  };
  
  // Buscar todos os tipos de usuário e encontrar pelo slug normalizado
  const allTipos = await db.select().from(tiposUsuario);
  let tipoUsuario = allTipos.find(t => normalizeSlug(t.nome) === data.role);
  
  if (!tipoUsuario) {
    // Se não encontrou pelo slug, tentar buscar pelo nome exato como fallback
    const [tipoExato] = await db.select().from(tiposUsuario).where(eq(tiposUsuario.nome, data.role));
    tipoUsuario = tipoExato;
  }
  
  if (!tipoUsuario) {
    throw new Error(`Tipo de usuário não encontrado: ${data.role}`);
  }
  
  // Verificar se já existe (buscar por tipoUsuarioId e aba)
  const existing = await db
    .select()
    .from(permissoesConfiguracoes)
    .where(
      and(
        eq(permissoesConfiguracoes.tipoUsuarioId, tipoUsuario.id),
        eq(permissoesConfiguracoes.aba, data.aba as any)
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    // Atualizar
    await db
      .update(permissoesConfiguracoes)
      .set({
        visualizar: data.visualizar,
        inserir: data.inserir,
        excluir: data.excluir,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(permissoesConfiguracoes.tipoUsuarioId, tipoUsuario.id),
          eq(permissoesConfiguracoes.aba, data.aba as any)
        )
      );
  } else {
    // Inserir
    await db.insert(permissoesConfiguracoes).values({
      role: data.role as any,
      aba: data.aba as any,
      visualizar: data.visualizar,
      inserir: data.inserir,
      excluir: data.excluir,
      tipoUsuarioId: tipoUsuario.id // Usar o ID correto do tipo de usuário
    });
  }
  
  return { success: true };
}

// ==================== COMPENSAÇÃO BANCÁRIA ====================
export async function getCompensacaoBancaria() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      vendaId: vendas.id,
      formandoNome: formandos.nome,
      turmaId: turmas.id,
      turmaCodigo: turmas.codigo,
      turmaCursos: turmas.cursos,
      turmaInstituicoes: turmas.instituicoes,
      turmaNumero: turmas.numeroTurma,
      turmaAno: turmas.anos,
      turmaPeriodo: turmas.periodos,
      eventoData: eventos.dataEvento,
      eventoTipo: eventos.tipoEvento,
      dataVenda: vendas.dataVenda,
      valorLiquido: pagamentos.valorLiquido, // Valor líquido de cada pagamento individual
      pagamentoTipo: pagamentos.tipo,
      pagamentoBandeira: pagamentos.bandeira,
      pagamentoParcelas: pagamentos.parcelas,
    })
    .from(vendas)
    .innerJoin(formandos, eq(vendas.formandoId, formandos.id))
    .innerJoin(turmas, eq(formandos.turmaId, turmas.id))
    .leftJoin(eventos, eq(vendas.eventoId, eventos.id))
    .innerJoin(pagamentos, eq(vendas.id, pagamentos.vendaId))
    .where(eq(vendas.excluido, false))
    .orderBy(desc(vendas.dataVenda));
  
  return result;
}


// ==================== FECHAMENTO MENSAL ====================

/**
 * Busca dados do sistema para o fechamento mensal
 * Retorna: dinheiro (vendas), maquiadora (total a pagar), investimentos (despesas)
 */
export async function getDadosSistemaFechamento(mes: number, ano: number) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  // 1. Buscar pagamentos em DINHEIRO do mês
  const resultDinheiro = await db
    .select({
      total: sql<number>`COALESCE(SUM(${pagamentos.valor}), 0)`
    })
    .from(pagamentos)
    .innerJoin(vendas, eq(vendas.id, pagamentos.vendaId))
    .where(
      and(
        eq(pagamentos.tipo, 'dinheiro'),
        sql`MONTH(${vendas.dataVenda}) = ${mes}`,
        sql`YEAR(${vendas.dataVenda}) = ${ano}`,
        eq(vendas.excluido, false)
      )
    );
  
  const dinheiro = (resultDinheiro[0]?.total || 0) / 100; // Converter de centavos
  
  // Mapear número do mês para nome do enum
  const mesesEnum = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const mesEnum = mesesEnum[mes - 1];
  
  // 2. Buscar saldo de MAQUIADORA do mês (Total a Pagar - Total a Receber)
  // Buscar serviços de make_formando (pagar) e make_familia (receber) do mês
  const primeiraData = new Date(ano, mes - 1, 1);
  const ultimaData = new Date(ano, mes, 0, 23, 59, 59);
  
  const servicosMake = await db
    .select({
      tipoServico: servicosExecucao.tipoServico,
      valorTotal: servicosExecucao.valorTotal,
    })
    .from(servicosExecucao)
    .where(
      and(
        or(
          eq(servicosExecucao.tipoServico, 'make_formando'),
          eq(servicosExecucao.tipoServico, 'make_familia')
        ),
        gte(servicosExecucao.dataRealizacao, primeiraData),
        lte(servicosExecucao.dataRealizacao, ultimaData)
      )
    );
  
  let totalPagar = 0;
  let totalReceber = 0;
  
  for (const servico of servicosMake) {
    if (servico.tipoServico === 'make_formando') {
      totalPagar += servico.valorTotal || 0;
    } else if (servico.tipoServico === 'make_familia') {
      totalReceber += servico.valorTotal || 0;
    }
  }
  
  // Saldo: Pagar - Receber (se negativo, Super A deve pagar; se positivo, deve receber)
  const saldoMaquiadora = totalPagar - totalReceber;
  const maquiadora = Math.abs(saldoMaquiadora) / 100; // Converter de centavos e pegar valor absoluto
  
  // 3. Buscar INVESTIMENTOS do mês (tipo "Equipamentos / Utensílios / Bens")
  const resultInvestimentos = await db
    .select({
      total: sql<number>`COALESCE(SUM(${despesasV2.valorTotal}), 0)`
    })
    .from(despesasV2)
    .where(
      and(
        eq(despesasV2.tipoServicoCompra, 'Equipamentos / Utensílios / Bens'),
        sql`${despesasV2.mesServico} = ${mesEnum}`,
        sql`YEAR(${despesasV2.createdAt}) = ${ano}`
      )
    );
  
  const investimentos = (resultInvestimentos[0]?.total || 0) / 100;
  
  // 4. Buscar TRANSFERÊNCIA SANTANDER do mês (tipo "Transferência Santander")
  const resultTransfSantander = await db
    .select({
      total: sql<number>`COALESCE(SUM(${despesasV2.valorTotal}), 0)`
    })
    .from(despesasV2)
    .where(
      and(
        eq(despesasV2.tipoServicoCompra, 'Transferência Santander'),
        sql`${despesasV2.mesServico} = ${mesEnum}`,
        sql`YEAR(${despesasV2.createdAt}) = ${ano}`
      )
    );
  
  const transfSantander = (resultTransfSantander[0]?.total || 0) / 100;
  
  // 5. Buscar OPERAÇÃO FORA DA PLATAFORMA do mês
  // Setor: Estúdio
  // Excluir tipos: Comissão, Equipamentos / Utensílios / Bens, Estorno, Imposto, Mão de Obra - Maquiadora, Transferência Santander
  const tiposExcluidos = [
    'Comissão',
    'Equipamentos / Utensílios / Bens',
    'Estorno',
    'Imposto',
    'Mão de Obra - Maquiadora',
    'Transferência Santander'
  ];
  
  const resultOperacaoFora = await db
    .select({
      total: sql<number>`COALESCE(SUM(${despesasV2.valorTotal}), 0)`
    })
    .from(despesasV2)
    .where(
      and(
        eq(despesasV2.setorSolicitante, 'estudio'),
        sql`${despesasV2.mesServico} = ${mesEnum}`,
        sql`YEAR(${despesasV2.createdAt}) = ${ano}`,
        not(inArray(despesasV2.tipoServicoCompra, tiposExcluidos))
      )
    );
  
  const operacaoFora = (resultOperacaoFora[0]?.total || 0) / 100;
  
  return {
    dinheiro,
    maquiadora,
    investimentos,
    transfSantander,
    operacaoFora
  };
}

/**
 * Busca valor bruto total das vendas do mês (base para cálculo de impostos)
 */
export async function getValorBrutoVendasMes(mes: number, ano: number) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  // Somar valorTotal das vendas (valor bruto antes das taxas)
  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${vendas.valorTotal}), 0)`
    })
    .from(vendas)
    .where(
      and(
        sql`MONTH(${vendas.dataVenda}) = ${mes}`,
        sql`YEAR(${vendas.dataVenda}) = ${ano}`,
        eq(vendas.excluido, false)
      )
    );
  
  // Converter de centavos para reais
  return (result[0]?.total || 0) / 100;
}

/**
 * Cria ou atualiza um fechamento mensal
 */
export async function upsertFechamentoMensal(data: InsertFechamentoMensal & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  if (data.id) {
    // Atualizar existente
    await db
      .update(fechamentosMensais)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(fechamentosMensais.id, data.id));
    
    return data.id;
  } else {
    // Criar novo
    const result = await db.insert(fechamentosMensais).values(data);
    return result[0].insertId;
  }
}

/**
 * Lista todos os fechamentos mensais
 */
export async function listFechamentosMensais() {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  const result = await db
    .select()
    .from(fechamentosMensais)
    .orderBy(desc(fechamentosMensais.ano), desc(fechamentosMensais.mes));
  
  return result;
}

/**
 * Busca fechamento mensal específico
 */
export async function getFechamentoMensal(mes: number, ano: number, tipo: 'vendas' | 'conta_bancaria') {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  const result = await db
    .select()
    .from(fechamentosMensais)
    .where(
      and(
        eq(fechamentosMensais.mes, mes),
        eq(fechamentosMensais.ano, ano),
        eq(fechamentosMensais.tipo, tipo)
      )
    )
    .limit(1);
  
  return result[0] || null;
}

/**
 * Busca fechamento mensal por ID
 */
export async function getFechamentoMensalById(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  const result = await db
    .select()
    .from(fechamentosMensais)
    .where(eq(fechamentosMensais.id, id))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Exclui fechamento mensal
 */
export async function deleteFechamentoMensal(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  // Deletar extratos vinculados primeiro
  await db
    .delete(extratosUploads)
    .where(eq(extratosUploads.fechamentoId, id));
  
  // Deletar fechamento
  await db
    .delete(fechamentosMensais)
    .where(eq(fechamentosMensais.id, id));
  
  return true;
}

/**
 * Salva upload de extrato
 */
export async function createExtratoUpload(data: InsertExtratoUpload) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  const result = await db.insert(extratosUploads).values(data);
  return result[0].insertId;
}

/**
 * Lista extratos de um fechamento
 */
export async function listExtratosUpload(fechamentoId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  const result = await db
    .select()
    .from(extratosUploads)
    .where(eq(extratosUploads.fechamentoId, fechamentoId))
    .orderBy(desc(extratosUploads.createdAt));
  
  return result;
}

/**
 * Cria despesa automática de saldo residual IRPJ
 * TODO: Implementar criação automática quando fornecedorId for opcional
 */
export async function criarDespesaSaldoIRPJ(
  mes: number,
  ano: number,
  valorSaldo: number,
  usuarioId: number,
  usuarioNome: string
) {
  // Por enquanto apenas retorna 0
  // Usuário deverá criar manualmente a despesa de saldo IRPJ
  return 0;
}


/**
 * Busca o valor configurado de Make Família por turma
 * Retorna o valor da tabela configMaquiagemTurma para a turma específica
 * Fallback: R$ 30,00 (3000 centavos) se não houver configuração
 */
export async function getValorMakeFamilia(turmaId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 3000; // Fallback se DB não estiver disponível
  
  const configs = await db.select()
    .from(configMaquiagemTurma)
    .where(eq(configMaquiagemTurma.turmaId, turmaId))
    .limit(1);
  
  if (configs.length > 0 && configs[0].valorFamilia) {
    return configs[0].valorFamilia;
  }
  
  // Fallback para R$ 30,00
  return 3000;
}


// ==================== DESPESAS MAQUIADORAS - CRON ====================

/**
 * Busca usuários por roles específicos
 */
export async function getUsuariosByRoles(roles: Array<'administrador' | 'gestor' | 'coordenador' | 'cerimonial' | 'beca' | 'logistica' | 'armazenamento' | 'financeiro'>) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(users)
    .where(inArray(users.role, roles));
  
  return result;
}

/**
 * Busca serviços de maquiagem do mês anterior
 * Retorna serviços agrupados por maquiadora, turma e tipo
 */
export async function getServicosMaquiagemMesAnterior(mes: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Calcular primeiro e último dia do mês
  const primeiroDia = new Date(ano, mes - 1, 1);
  const ultimoDia = new Date(ano, mes, 0, 23, 59, 59);
  
  const result = await db
    .select({
      maquiadoraId: servicosExecucao.fornecedorId,
      maquiadoraNome: fornecedores.nome,
      turmaId: eventos.turmaId,
      turmaCodigo: turmas.codigo,
      tipoServico: servicosExecucao.tipoServico,
      valor: servicosExecucao.valorTotal,
      quantidade: servicosExecucao.quantidade,
    })
    .from(servicosExecucao)
    .innerJoin(eventos, eq(servicosExecucao.eventoId, eventos.id))
    .innerJoin(turmas, eq(eventos.turmaId, turmas.id))
    .leftJoin(fornecedores, eq(servicosExecucao.fornecedorId, fornecedores.id))
    .where(
      and(
        gte(servicosExecucao.createdAt, primeiroDia),
        lte(servicosExecucao.createdAt, ultimoDia),
        inArray(servicosExecucao.tipoServico, ['make_formando', 'make_familia'])
      )
    );
  
  return result;
}

/**
 * Cria despesa de maquiadora automaticamente
 */
export async function createDespesaMaquiadora(data: {
  fornecedorId: number;
  turmaId: number;
  mesServico: number; // 1-12
  detalhamento: string;
  valor: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  // Mapear número do mês para enum
  const mesesEnum = [
    'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ] as const;
  
  const mesServicoEnum = mesesEnum[data.mesServico - 1];
  
  // Gerar número CI automático
  const ano = new Date().getFullYear();
  const sequenciaResult = await db
    .select()
    .from(sequenciaCi)
    .where(eq(sequenciaCi.ano, ano))
    .limit(1);
  
  let numeroSequencia = 1;
  if (sequenciaResult.length > 0) {
    numeroSequencia = sequenciaResult[0].ultimoNumero + 1;
    await db
      .update(sequenciaCi)
      .set({ ultimoNumero: numeroSequencia })
      .where(eq(sequenciaCi.ano, ano));
  } else {
    await db.insert(sequenciaCi).values({ ano, ultimoNumero: 1 });
  }
  
  const numeroCi = `${String(numeroSequencia).padStart(3, '0')}/${ano}`;
  
  // Buscar dados do fornecedor para preencher dadosPagamento
  const fornecedor = await db
    .select()
    .from(fornecedores)
    .where(eq(fornecedores.id, data.fornecedorId))
    .limit(1);
  
  let dadosPagamento = 'PIX';
  if (fornecedor.length > 0 && fornecedor[0].chavesPix) {
    const chavesPix = JSON.parse(fornecedor[0].chavesPix);
    dadosPagamento = Array.isArray(chavesPix) && chavesPix.length > 0 ? chavesPix[0] : 'PIX';
  }
  
  // Criar despesa (criadoPorId = 1 para sistema automático)
  const despesaResult = await db.insert(despesasV2).values({
    numeroCi,
    tipoDespesa: 'operacional',
    mesServico: mesServicoEnum,
    setorSolicitante: 'estudio',
    fornecedorId: data.fornecedorId,
    detalhamento: data.detalhamento,
    valorTotal: Math.round(data.valor * 100), // Converter para centavos
    tipoPagamento: 'pix',
    dadosPagamento,
    status: 'aguardando_aprovacao_gestor',
    criadoPorId: 1, // Sistema automático
    createdAt: new Date(),
  });
  
  const despesaId = despesaResult[0].insertId;
  
  // Vincular turma
  await db.insert(despesasV2Turmas).values({
    despesaId,
    turmaId: data.turmaId,
    tipoEvento: null,
  });
  
  return despesaId;
}


// ==================== AUDITORIA FINANCEIRA ====================

/**
 * Busca valores de lançamentos do sistema (vendas e pagamentos) para um mês específico
 */
export async function getLancamentosSistema(mes: number, ano: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Calcular data início e fim do mês
  const dataInicio = new Date(ano, mes - 1, 1);
  const dataFim = new Date(ano, mes, 0, 23, 59, 59);

  // Buscar pagamentos do mês
  const pagamentosResult = await db
    .select({
      tipo: pagamentos.tipo,
      valor: pagamentos.valor,
      valorLiquido: pagamentos.valorLiquido,
      vendaId: pagamentos.vendaId,
    })
    .from(pagamentos)
    .innerJoin(vendas, eq(vendas.id, pagamentos.vendaId))
    .where(
      and(
        gte(vendas.dataVenda, dataInicio),
        lte(vendas.dataVenda, dataFim),
        eq(vendas.excluido, false) // Não incluir vendas excluídas
      )
    );

  // Calcular totais por tipo de pagamento
  let totalCartoes = 0;
  let totalPix = 0;
  let totalDinheiro = 0;

  for (const pag of pagamentosResult) {
    const tipo = pag.tipo?.toLowerCase() || '';
    const valorLiq = Number(pag.valorLiquido || 0) / 100; // Converter de centavos para reais
    const valorBruto = Number(pag.valor || 0) / 100;

    if (tipo === 'credito' || tipo === 'debito') {
      totalCartoes += valorLiq; // Cartões usam valor líquido
    } else if (tipo === 'pix') {
      totalPix += valorBruto; // PIX usa valor bruto
    } else if (tipo === 'dinheiro') {
      totalDinheiro += valorBruto; // Dinheiro usa valor bruto
    }
  }

  return {
    cartoes: totalCartoes,
    pix: totalPix,
    dinheiro: totalDinheiro,
    total: totalCartoes + totalPix + totalDinheiro,
  };
}

/**
 * Busca valores de lançamentos do banco (fechamentos mensais) para um mês específico
 */
export async function getLancamentosBanco(mes: number, ano: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar fechamento mensal do mês/ano especificado
  const fechamento = await db
    .select({
      receitaCartoes: fechamentosMensais.receitaCartoes,
      receitaPix: fechamentosMensais.receitaPix,
      receitaDinheiro: fechamentosMensais.receitaDinheiro,
    })
    .from(fechamentosMensais)
    .where(
      and(
        eq(fechamentosMensais.mes, mes),
        eq(fechamentosMensais.ano, ano),
        eq(fechamentosMensais.tipo, 'conta_bancaria')
      )
    )
    .limit(1);

  if (!fechamento || fechamento.length === 0) {
    return {
      cartoes: 0,
      pix: 0,
      dinheiro: 0,
      total: 0,
      encontrado: false,
    };
  }

  const f = fechamento[0];
  const cartoes = Number(f.receitaCartoes || 0) / 100;
  const pix = Number(f.receitaPix || 0) / 100;
  const dinheiro = Number(f.receitaDinheiro || 0) / 100;

  return {
    cartoes,
    pix,
    dinheiro,
    total: cartoes + pix + dinheiro,
    encontrado: true,
  };
}


// ==================== PERMISSÕES CERIMONIAIS (ACESSO POR TURMA) ====================

// Listar usuários do tipo Cerimonial
export async function getUsuariosCerimoniais() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.role, "cerimonial"));
}

// Listar turmas vinculadas a um usuário
export async function getTurmasUsuario(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: usuarioTurmas.id,
      userId: usuarioTurmas.userId,
      turmaId: usuarioTurmas.turmaId,
      createdAt: usuarioTurmas.createdAt,
    })
    .from(usuarioTurmas)
    .where(eq(usuarioTurmas.userId, userId));
}

// Vincular usuário a turmas (substitui todos os vínculos anteriores)
export async function vincularUsuarioTurmas(userId: number, turmaIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. Remover todos os vínculos anteriores
  await db.delete(usuarioTurmas).where(eq(usuarioTurmas.userId, userId));

  // 2. Inserir novos vínculos
  if (turmaIds.length > 0) {
    const vinculos = turmaIds.map(turmaId => ({
      userId,
      turmaId,
    }));
    await db.insert(usuarioTurmas).values(vinculos);
  }

  return { success: true, count: turmaIds.length };
}

// Remover vínculo de uma turma específica
export async function desvincularUsuarioTurma(userId: number, turmaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(usuarioTurmas)
    .where(
      and(
        eq(usuarioTurmas.userId, userId),
        eq(usuarioTurmas.turmaId, turmaId)
      )
    );

  return { success: true };
}

// Verificar se usuário tem acesso a uma turma específica
export async function usuarioTemAcessoTurma(userId: number, turmaId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const vinculo = await db
    .select()
    .from(usuarioTurmas)
    .where(
      and(
        eq(usuarioTurmas.userId, userId),
        eq(usuarioTurmas.turmaId, turmaId)
      )
    )
    .limit(1);

  return vinculo.length > 0;
}

// Listar IDs de turmas que o usuário tem acesso
export async function getTurmaIdsUsuario(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  const vinculos = await db
    .select({ turmaId: usuarioTurmas.turmaId })
    .from(usuarioTurmas)
    .where(eq(usuarioTurmas.userId, userId));

  return vinculos.map(v => v.turmaId);
}

// ==================== VENDAS EXCLUÍDAS E EDITADAS ====================
export async function getAlteracoesVendas() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select({
      id: historicoAlteracoesVendas.id,
      vendaId: historicoAlteracoesVendas.vendaId,
      tipo: historicoAlteracoesVendas.tipo,
      dataAlteracao: historicoAlteracoesVendas.dataAlteracao,
      motivo: historicoAlteracoesVendas.motivo,
      camposAlterados: historicoAlteracoesVendas.camposAlterados,
      snapshotVenda: historicoAlteracoesVendas.snapshotVenda,
      usuarioNome: users.name,
      dataVenda: vendas.dataVenda,
      valorTotal: vendas.valorTotal,
      formandoNome: formandos.nome,
      formandoCpf: formandos.cpf,
      turmaCodigo: turmas.codigo,
      turmaCursos: turmas.cursos,
      turmaInstituicoes: turmas.instituicoes,
      turmaNumero: turmas.numeroTurma,
      turmaAnos: turmas.anos,
      turmaPeriodos: turmas.periodos,
    })
    .from(historicoAlteracoesVendas)
    .leftJoin(vendas, eq(historicoAlteracoesVendas.vendaId, vendas.id))
    .leftJoin(users, eq(historicoAlteracoesVendas.usuarioId, users.id))
    .leftJoin(formandos, eq(vendas.formandoId, formandos.id))
    .leftJoin(turmas, eq(formandos.turmaId, turmas.id))
    .orderBy(desc(historicoAlteracoesVendas.dataAlteracao));
  
  // Processar resultados para usar snapshot quando venda foi excluída
  return result.map((item) => {
    // Se a venda foi excluída (dataVenda é null) e temos snapshot, usar dados do snapshot
    if (!item.dataVenda && item.snapshotVenda) {
      const snapshot = item.snapshotVenda as any;
      return {
        ...item,
        dataVenda: snapshot.dataVenda,
        valorTotal: snapshot.valorTotal,
        formandoNome: snapshot.formandoNome,
        formandoCpf: snapshot.formandoCpf,
        turmaCodigo: snapshot.turmaCodigo,
        turmaCursos: snapshot.turmaCursos,
        turmaInstituicoes: snapshot.turmaInstituicoes,
        turmaNumero: snapshot.turmaNumero,
        turmaAnos: snapshot.turmaAnos,
        turmaPeriodos: snapshot.turmaPeriodos,
      };
    }
    return item;
  });
}

// Manter compatibilidade com código antigo
export async function getVendasExcluidas() {
  return getAlteracoesVendas();
}

// Registrar exclusão de venda no histórico
export async function registrarExclusaoVenda(
  vendaId: number,
  usuarioId: number,
  motivo: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar dados completos da venda antes de excluir
  const vendaCompleta = await db
    .select({
      vendaId: vendas.id,
      dataVenda: vendas.dataVenda,
      valorTotal: vendas.valorTotal,
      status: vendas.status,
      formandoId: vendas.formandoId,
      formandoNome: formandos.nome,
      formandoCpf: formandos.cpf,
      turmaCodigo: turmas.codigo,
      turmaCursos: turmas.cursos,
      turmaInstituicoes: turmas.instituicoes,
      turmaNumero: turmas.numeroTurma,
      turmaAnos: turmas.anos,
      turmaPeriodos: turmas.periodos,
    })
    .from(vendas)
    .leftJoin(formandos, eq(vendas.formandoId, formandos.id))
    .leftJoin(turmas, eq(formandos.turmaId, turmas.id))
    .where(eq(vendas.id, vendaId))
    .limit(1);

  const snapshot = vendaCompleta.length > 0 ? vendaCompleta[0] : null;

  await db.insert(historicoAlteracoesVendas).values({
    vendaId,
    tipo: "exclusao",
    usuarioId,
    motivo,
    camposAlterados: null,
    snapshotVenda: snapshot,
  });
}

// Registrar edição de venda no histórico
export async function registrarEdicaoVenda(
  vendaId: number,
  usuarioId: number,
  motivo: string,
  camposAlterados: Record<string, { antes: any; depois: any }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar dados completos da venda
  const vendaCompleta = await db
    .select({
      vendaId: vendas.id,
      dataVenda: vendas.dataVenda,
      valorTotal: vendas.valorTotal,
      status: vendas.status,
      formandoId: vendas.formandoId,
      formandoNome: formandos.nome,
      formandoCpf: formandos.cpf,
      turmaCodigo: turmas.codigo,
      turmaCursos: turmas.cursos,
      turmaInstituicoes: turmas.instituicoes,
      turmaNumero: turmas.numeroTurma,
      turmaAnos: turmas.anos,
      turmaPeriodos: turmas.periodos,
    })
    .from(vendas)
    .leftJoin(formandos, eq(vendas.formandoId, formandos.id))
    .leftJoin(turmas, eq(formandos.turmaId, turmas.id))
    .where(eq(vendas.id, vendaId))
    .limit(1);

  const snapshot = vendaCompleta.length > 0 ? vendaCompleta[0] : null;

  await db.insert(historicoAlteracoesVendas).values({
    vendaId,
    tipo: "edicao",
    usuarioId,
    motivo,
    camposAlterados,
    snapshotVenda: snapshot,
  });
}


// ==================== BRIEFING - TURMAS COM BRIEFING CRIADO ====================

/**
 * Lista todas as turmas que possuem briefing criado
 * Retorna: Turma (código - curso instituição nº.período), Tipo de Evento
 */
export async function getTurmasComBriefingCriado() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(
    sql`SELECT DISTINCT 
      t.id as turmaId,
      t.codigo as turmaCodigo,
      t.numeroTurma as turmaNumeroTurma,
      t.cursos as turmaCursos,
      t.instituicoes as turmaInstituicoes,
      t.anos as turmaAnos,
      t.periodos as turmaPeriodos,
      e.tipoEvento
    FROM turmas t
    INNER JOIN eventos e ON e.turmaId = t.id
    INNER JOIN briefing_grupo bg ON bg.eventoId = e.id
    ORDER BY t.codigo, e.tipoEvento`
  );
  
  const rows = result[0];
  return Array.isArray(rows) ? rows : [];
}

// ==================== DASHBOARD - RELATÓRIOS ====================

/**
 * Retorna total bruto de vendas por mês para um ano específico
 */
export async function getDadosVendasMensais(ano: number) {
  const db = await getDb();
  if (!db) return [];

  // Usar SQL raw para evitar ambiguidade do Drizzle
  const queryResult = await db.execute(sql`
    SELECT 
      MONTH(dataVenda) as mes,
      COALESCE(SUM(valorTotal), 0) as totalBruto
    FROM vendas
    WHERE YEAR(dataVenda) = ${ano}
      AND excluido = 0
    GROUP BY MONTH(dataVenda)
    ORDER BY MONTH(dataVenda)
  `);

  // Extrair rows do resultado (Drizzle retorna [rows, metadata])
  const result = Array.isArray(queryResult) ? queryResult[0] : queryResult;

  // Inicializar todos os meses com 0
  const dadosCompletos = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    totalBruto: 0,
  }));

  // Preencher com dados reais
  if (Array.isArray(result)) {
    result.forEach((row: any) => {
      if (row.mes && row.mes >= 1 && row.mes <= 12) {
        // Converter totalBruto para número (MySQL pode retornar como string)
        const totalBruto = typeof row.totalBruto === 'string' ? parseInt(row.totalBruto, 10) : (row.totalBruto || 0);
        dadosCompletos[row.mes - 1].totalBruto = totalBruto;
      }
    });
  }

  return dadosCompletos;
}

/**
 * Retorna despesas mensais por setor (Fotografia, Estúdio, Becas) para um ano específico
 */
export async function getDadosDespesasMensais(ano: number) {
  const db = await getDb();
  if (!db) return [];

  // Mapear meses em português para números
  const mesesMap: Record<string, number> = {
    janeiro: 1,
    fevereiro: 2,
    marco: 3,
    abril: 4,
    maio: 5,
    junho: 6,
    julho: 7,
    agosto: 8,
    setembro: 9,
    outubro: 10,
    novembro: 11,
    dezembro: 12,
  };

  // Usar subquery para filtrar despesas pelo ano das datas de realização
  // Evita duplicação de valores quando uma despesa tem múltiplas datas
  const [rows] = await db.execute(sql`
    SELECT 
      d.mesServico as mes,
      d.setorSolicitante as setor,
      SUM(d.valorTotal) as totalDespesa
    FROM despesas_v2 d
    WHERE d.excluido = 0
      AND d.id IN (
        SELECT DISTINCT dd.despesaId 
        FROM despesas_v2_datas dd 
        WHERE YEAR(dd.dataRealizacao) = ${ano}
      )
    GROUP BY d.mesServico, d.setorSolicitante
    ORDER BY d.mesServico
  `);

  // Inicializar todos os meses com valores zerados para cada setor
  const dadosFormatados: Array<{
    mes: number;
    fotografia: number;
    estudio: number;
    becas: number;
  }> = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    fotografia: 0,
    estudio: 0,
    becas: 0,
  }));

  // Preencher com os dados reais
  const result = rows as unknown as Array<{ mes: string; setor: string; totalDespesa: number }>;
  result.forEach((row) => {
    const mesNumero = mesesMap[row.mes];
    const mesIndex = mesNumero - 1;
    
    // Converter para número para garantir tipo correto
    const valorNumerico = Number(row.totalDespesa) || 0;
    
    if (row.setor === "fotografia") {
      dadosFormatados[mesIndex].fotografia = valorNumerico;
    } else if (row.setor === "estudio") {
      dadosFormatados[mesIndex].estudio = valorNumerico;
    } else if (row.setor === "becas") {
      dadosFormatados[mesIndex].becas = valorNumerico;
    }
  });

  return dadosFormatados;
}

// ==================== SINCRONIZAÇÃO EXECUÇÃO → BRIEFING ====================

/**
 * Sincroniza dados da Execução para o Briefing
 * Quando formandos são registrados na Execução (fotos, serviços), 
 * os dados devem aparecer automaticamente na Abordagem (Briefing)
 */
export async function syncExecucaoToBriefing(eventoId: number) {
  const db = await getDb();
  if (!db) {
    console.warn('[syncExecucaoToBriefing] Database not available');
    return { success: false, message: 'Database not available' };
  }

  try {
    console.log(`[syncExecucaoToBriefing] Iniciando sincronização para eventoId: ${eventoId}`);

    // 1. Buscar todas as execuções do evento
    const execucoes = await db
      .select()
      .from(execucaoFormando)
      .where(eq(execucaoFormando.eventoId, eventoId));

    if (execucoes.length === 0) {
      console.log('[syncExecucaoToBriefing] Nenhuma execução encontrada');
      return { success: true, message: 'Nenhuma execução para sincronizar' };
    }

    console.log(`[syncExecucaoToBriefing] Encontradas ${execucoes.length} execuções`);

    // 2. Verificar se já existe grupo para este evento
    const gruposExistentes = await db
      .select()
      .from(briefingGrupo)
      .where(eq(briefingGrupo.eventoId, eventoId));

    let grupoId: number;

    if (gruposExistentes.length === 0) {
      // Criar grupo padrão "Grupo 1"
      console.log('[syncExecucaoToBriefing] Criando grupo padrão');
      const result = await db.insert(briefingGrupo).values({
        eventoId,
        numero: 1,
        horarioFormandos: '08:00',
        limiteFormandos: 999, // Sem limite para sincronização automática
        ativo: true,
      });
      grupoId = Number(result[0].insertId);
      console.log(`[syncExecucaoToBriefing] Grupo criado com ID: ${grupoId}`);
    } else {
      grupoId = gruposExistentes[0].id;
      console.log(`[syncExecucaoToBriefing] Usando grupo existente ID: ${grupoId}`);
    }

    // 3. Buscar todos os briefings existentes de uma vez
    const briefingsExistentes = await db
      .select()
      .from(briefingFormando)
      .where(eq(briefingFormando.eventoId, eventoId));

    const briefingMap = new Map(
      briefingsExistentes.map(b => [b.formandoId, b])
    );

    // 4. Separar em updates e inserts
    const toUpdate: Array<{ id: number; data: any }> = [];
    const toInsert: Array<any> = [];
    let nextOrdem = briefingsExistentes.length + 1;

    for (const execucao of execucoes) {
      const existente = briefingMap.get(execucao.formandoId);
      
      if (existente) {
        toUpdate.push({
          id: existente.id,
          data: {
            grupoId: grupoId,
            observacao: execucao.observacoes || undefined,
            updatedAt: new Date(),
          }
        });
      } else {
        toInsert.push({
          grupoId: grupoId,
          eventoId: eventoId,
          formandoId: execucao.formandoId,
          ordem: nextOrdem++,
          observacao: execucao.observacoes || undefined,
          makeFormando: false,
          cabeloFormando: false,
          qtdMakeFamilia: 0,
          qtdCabeloSimples: 0,
          qtdCabeloCombinado: 0,
          qtdFamilia: 0,
          qtdPets: 0,
          somenteGrupo: false,
        });
      }
    }

    // 5. Executar operações em lote
    let sincronizados = 0;
    let erros = 0;

    try {
      // Inserir novos registros em lote
      if (toInsert.length > 0) {
        await db.insert(briefingFormando).values(toInsert);
        sincronizados += toInsert.length;
        console.log(`[syncExecucaoToBriefing] Inseridos ${toInsert.length} novos registros`);
      }

      // Atualizar registros existentes (infelizmente precisa ser um por um)
      for (const update of toUpdate) {
        try {
          await db
            .update(briefingFormando)
            .set(update.data)
            .where(eq(briefingFormando.id, update.id));
          sincronizados++;
        } catch (error) {
          console.error(`[syncExecucaoToBriefing] Erro ao atualizar ID ${update.id}:`, error);
          erros++;
        }
      }
      
      console.log(`[syncExecucaoToBriefing] Atualizados ${toUpdate.length - erros} registros`);
    } catch (error) {
      console.error('[syncExecucaoToBriefing] Erro nas operações em lote:', error);
      erros = toInsert.length;
    }

    console.log(`[syncExecucaoToBriefing] Sincronização concluída: ${sincronizados} sucesso, ${erros} erros`);

    return {
      success: true,
      message: `Sincronizados ${sincronizados} formandos`,
      sincronizados,
      erros,
    };
  } catch (error) {
    console.error('[syncExecucaoToBriefing] Erro geral:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

// ==================== BACKUP LOGS ====================
export async function getBackupLogs(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  const { backupLogs } = await import("../drizzle/schema");
  const { desc } = await import("drizzle-orm");
  
  return db.select()
    .from(backupLogs)
    .orderBy(desc(backupLogs.createdAt))
    .limit(limit);
}
