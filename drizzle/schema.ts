import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, datetime, date, decimal, json } from "drizzle-orm/mysql-core";

// ==================== LOGS DE BACKUP ====================
export const backupLogs = mysqlTable("backup_logs", {
  id: int("id").autoincrement().primaryKey(),
  dataHora: timestamp("dataHora").notNull(),
  status: mysqlEnum("status", ["sucesso", "erro"]).notNull(),
  mensagem: text("mensagem"),
  tamanhoArquivo: int("tamanhoArquivo"), // em bytes
  emailEnviado: boolean("emailEnviado").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BackupLog = typeof backupLogs.$inferSelect;
export type InsertBackupLog = typeof backupLogs.$inferInsert;

// ==================== TIPOS DE USUÁRIO ====================
export const tiposUsuario = mysqlTable("tipos_usuario", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TipoUsuario = typeof tiposUsuario.$inferSelect;
export type InsertTipoUsuario = typeof tiposUsuario.$inferInsert;

// ==================== USUÁRIOS ====================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  tipoUsuarioId: int("tipoUsuarioId"),
  role: mysqlEnum("role", ["administrador", "gestor", "coordenador", "cerimonial", "beca", "logistica", "armazenamento", "financeiro", "controle"]).default("coordenador").notNull(),
  status: mysqlEnum("status", ["pendente", "aprovado", "rejeitado"]).default("pendente").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ==================== INSTITUIÇÕES ====================
export const instituicoes = mysqlTable("instituicoes", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 200 }).notNull().unique(),
  sigla: varchar("sigla", { length: 20 }),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Instituicao = typeof instituicoes.$inferSelect;
export type InsertInstituicao = typeof instituicoes.$inferInsert;

// ==================== CURSOS ====================
export const cursos = mysqlTable("cursos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Curso = typeof cursos.$inferSelect;
export type InsertCurso = typeof cursos.$inferInsert;

// ==================== CIDADES ====================
export const cidades = mysqlTable("cidades", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  estado: varchar("estado", { length: 2 }).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Cidade = typeof cidades.$inferSelect;
export type InsertCidade = typeof cidades.$inferInsert;

// ==================== LOCAIS ====================
export const locais = mysqlTable("locais", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 200 }).notNull().unique(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Local = typeof locais.$inferSelect;
export type InsertLocal = typeof locais.$inferInsert;

// ==================== TIPOS DE SERVIÇO ====================
export const tiposServico = mysqlTable("tipos_servico", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TipoServico = typeof tiposServico.$inferSelect;
export type InsertTipoServico = typeof tiposServico.$inferInsert;

// ==================== FORNECEDORES ====================
export const fornecedores = mysqlTable("fornecedores", {
  id: int("id").autoincrement().primaryKey(),
  tipoPessoa: mysqlEnum("tipoPessoa", ["PF", "PJ"]), // Opcional
  cpfCnpj: varchar("cpfCnpj", { length: 20 }), // Opcional
  nome: varchar("nome", { length: 255 }).notNull(), // Obrigatório
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  tiposServico: text("tiposServico"), // JSON array de IDs de tipos de serviço
  // Endereço
  cep: varchar("cep", { length: 10 }),
  logradouro: varchar("logradouro", { length: 255 }),
  bairro: varchar("bairro", { length: 100 }),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  // Dados Bancários
  banco: varchar("banco", { length: 100 }),
  agencia: varchar("agencia", { length: 20 }),
  conta: varchar("conta", { length: 30 }),
  pix: varchar("pix", { length: 255 }), // Campo legado
  chavesPix: text("chavesPix"), // JSON array de chaves Pix (múltiplas)
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Fornecedor = typeof fornecedores.$inferSelect;
export type InsertFornecedor = typeof fornecedores.$inferInsert;

// ==================== TABELA DE PREÇO FORNECEDORES ====================
export const tabelaPrecoFornecedores = mysqlTable("tabela_preco_fornecedores", {
  id: int("id").autoincrement().primaryKey(),
  fornecedorId: int("fornecedorId").notNull(),
  tipoServicoId: int("tipoServicoId").notNull(),
  tipoEventoId: int("tipoEventoId").notNull(),
  valor: int("valor").notNull(), // em centavos
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TabelaPrecoFornecedor = typeof tabelaPrecoFornecedores.$inferSelect;
export type InsertTabelaPrecoFornecedor = typeof tabelaPrecoFornecedores.$inferInsert;

// ==================== TIPOS DE EVENTO ====================
export const tiposEvento = mysqlTable("tipos_evento", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  codigo: varchar("codigo", { length: 50 }).notNull().unique(), // ex: foto_estudio, foto_oficial
  cor: varchar("cor", { length: 20 }).default("#3b82f6"), // cor para exibição no calendário
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TipoEvento = typeof tiposEvento.$inferSelect;
export type InsertTipoEvento = typeof tiposEvento.$inferInsert;

// ==================== TURMAS ====================
export const turmas = mysqlTable("turmas", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 50 }).notNull().unique(),
  cursos: text("cursos").notNull(), // JSON array de cursos
  instituicoes: text("instituicoes").notNull(), // JSON array de instituições
  numeroTurma: varchar("numeroTurma", { length: 20 }),
  anos: text("anos").notNull(), // JSON array de anos
  periodos: text("periodos").notNull(), // JSON array de períodos ("1" ou "2")
  cidade: varchar("cidade", { length: 100 }).notNull(),
  estado: varchar("estado", { length: 2 }).notNull(),
  fotosInclusas: mysqlEnum("fotosInclusas", ["todas", "30", "20", "10"]),
  observacao: text("observacao"),
  observacoesBeca: text("observacoesBeca"),
  // Valores de serviços de Make e Cabelo (em centavos)
  valorMakeFormandoMasc: int("valorMakeFormandoMasc"), // Make Formando Masculino
  valorMakeFormandoFem: int("valorMakeFormandoFem"), // Make Formando Feminino
  valorMakeFamilia: int("valorMakeFamilia"), // Make Família
  valorCabeloSimples: int("valorCabeloSimples"), // Cabelo Simples
  valorCabeloCombinado: int("valorCabeloCombinado"), // Cabelo Combinado
  valorRetoque: int("valorRetoque"), // Retoque
  // Configuração de Pacotes e Eventos Inclusos
  pacotesConfig: text("pacotesConfig"), // JSON: [{nome: string, tiposEventos: string[]}]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Turma = typeof turmas.$inferSelect;
export type InsertTurma = typeof turmas.$inferInsert;

// ==================== FORMANDOS ====================
export const formandos = mysqlTable("formandos", {
  id: int("id").autoincrement().primaryKey(),
  turmaId: int("turmaId").notNull().references(() => turmas.id, { onDelete: "restrict" }),
  codigoFormando: varchar("codigoFormando", { length: 50 }).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }),
  telefone: varchar("telefone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  genero: mysqlEnum("genero", ["masculino", "feminino"]).default("masculino"),
  pacote: varchar("pacote", { length: 100 }),
  // Campos de pacote detalhados
  cabeloSimples: int("cabeloSimples").default(0),
  cabeloCombinado: int("cabeloCombinado").default(0),
  makeFormando: int("makeFormando").default(0),
  makeFamilia: int("makeFamilia").default(0),
  status: mysqlEnum("status", ["apto", "inapto", "migracao"]),
  eComissao: boolean("eComissao").default(false),
  // Campos de execução
  tamanhoBeca: varchar("tamanhoBeca", { length: 10 }), // PPP, PP, P, M, G, GG, GGG (Beca - Estúdio)
  becaEvento: varchar("becaEvento", { length: 10 }), // PPP, PP, P, M, G, GG, GGG (Beca - Evento)
  maquiagem: boolean("maquiagem").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Formando = typeof formandos.$inferSelect;
export type InsertFormando = typeof formandos.$inferInsert;

// ==================== EVENTOS FOTOGRÁFICOS ====================
export const eventos = mysqlTable("eventos", {
  id: int("id").autoincrement().primaryKey(),
  turmaId: int("turmaId").notNull(),
  tipoEvento: mysqlEnum("tipoEvento", [
    "foto_estudio",
    "foto_50",
    "foto_descontrada",
    "foto_oficial",
    "foto_samu",
    "foto_bloco",
    "foto_consultorio",
    "foto_estrela",
    "foto_internato",
    "family_day"
  ]).notNull(),
  dataEvento: datetime("dataEvento"),
  dataEventoFim: datetime("dataEventoFim"),
  local: varchar("local", { length: 255 }),
  cenarios: text("cenarios"), // JSON array de {nome: string, fotografoId: number}
  fotografos: text("fotografos"), // JSON array de IDs de fornecedores fotógrafos
  cerimoniais: text("cerimoniais"), // JSON array de IDs de fornecedores cerimoniais
  coordenadores: text("coordenadores"), // JSON array de IDs de fornecedores coordenadores
  producao: text("producao"), // JSON array de IDs de fornecedores de produção
  maquiadoras: text("maquiadoras"), // JSON array de IDs de fornecedores maquiadoras
  horariosInicio: text("horariosInicio"), // JSON array de {data: string, horario: string}
  observacao: text("observacao"),
  status: mysqlEnum("status", ["agendado", "em_andamento", "concluido", "cancelado"]).default("agendado"),
  // Acesso da comissão ao briefing
  acessoComissaoHabilitado: boolean("acessoComissaoHabilitado").default(false).notNull(),
  prazoEdicaoComissao: datetime("prazoEdicaoComissao"),
  tokenAcessoComissao: varchar("tokenAcessoComissao", { length: 64 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Evento = typeof eventos.$inferSelect;
export type InsertEvento = typeof eventos.$inferInsert;

// ==================== AGENDAMENTOS ====================
export const agendamentos = mysqlTable("agendamentos", {
  id: int("id").autoincrement().primaryKey(),
  eventoId: int("eventoId").notNull(),
  formandoId: int("formandoId").notNull(),
  grupo: varchar("grupo", { length: 50 }),
  dataAgendamento: datetime("dataAgendamento").notNull(),
  horaFormando: varchar("horaFormando", { length: 5 }),
  horaChegadaFormando: varchar("horaChegadaFormando", { length: 5 }),
  horaFamilia: varchar("horaFamilia", { length: 5 }),
  horaChegadaFamilia: varchar("horaChegadaFamilia", { length: 5 }),
  tamanhoBeca: mysqlEnum("tamanhoBeca", ["PPP", "PP", "P", "M", "G", "GG", "GGG"]),
  situacao: mysqlEnum("situacao", ["aguardando", "em_atendimento", "concluido", "ausente"]).default("aguardando"),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agendamento = typeof agendamentos.$inferSelect;
export type InsertAgendamento = typeof agendamentos.$inferInsert;

// ==================== SERVIÇOS AGENDADOS ====================
export const servicosAgendados = mysqlTable("servicosAgendados", {
  id: int("id").autoincrement().primaryKey(),
  agendamentoId: int("agendamentoId").notNull(),
  tipoServico: mysqlEnum("tipoServico", [
    "maquiagem_formando",
    "maquiagem_familia",
    "cabelo_simples",
    "cabelo_combinado"
  ]).notNull(),
  realizado: boolean("realizado").default(false),
  valorPago: int("valorPago").default(0), // em centavos
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ServicoAgendado = typeof servicosAgendados.$inferSelect;
export type InsertServicoAgendado = typeof servicosAgendados.$inferInsert;

// ==================== CENÁRIOS ====================
export const cenarios = mysqlTable("cenarios", {
  id: int("id").autoincrement().primaryKey(),
  agendamentoId: int("agendamentoId").notNull(),
  nomeCenario: varchar("nomeCenario", { length: 100 }).notNull(),
  nomeFotografo: varchar("nomeFotografo", { length: 100 }),
  numeroArquivos: int("numeroArquivos").default(0),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Cenario = typeof cenarios.$inferSelect;
export type InsertCenario = typeof cenarios.$inferInsert;

// ==================== VENDAS ====================
export const vendas = mysqlTable("vendas", {
  id: int("id").autoincrement().primaryKey(),
  agendamentoId: int("agendamentoId"),
  reuniaoId: int("reuniaoId"), // ID da reunião (quando venda vem de Atendimento)
  eventoId: int("eventoId").notNull().references(() => eventos.id, { onDelete: "restrict" }),
  formandoId: int("formandoId").notNull().references(() => formandos.id, { onDelete: "restrict" }),
  dataVenda: datetime("dataVenda").notNull(),
  valorTotal: int("valorTotal").notNull(), // em centavos
  valorLiquido: int("valorLiquido"), // em centavos (após taxas)
  status: mysqlEnum("status", ["pendente", "pago", "cancelada"]).default("pendente"),
  fase: mysqlEnum("fase", ["Atendimento", "Execução", "Armazenamento"]).notNull(), // Fase da venda
  observacao: text("observacao"),
  createdBy: int("createdBy").notNull(), // ID do usuário que criou a venda
  excluido: boolean("excluido").default(false).notNull(), // Soft delete
  excluidoPor: int("excluidoPor"), // ID do usuário que excluiu
  excluidoEm: timestamp("excluidoEm"), // Data/hora da exclusão
  motivoExclusao: text("motivoExclusao"), // Motivo da exclusão
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Venda = typeof vendas.$inferSelect;
export type InsertVenda = typeof vendas.$inferInsert;

// ==================== ITENS DE VENDA ====================
export const itensVenda = mysqlTable("itensVenda", {
  id: int("id").autoincrement().primaryKey(),
  vendaId: int("vendaId").notNull(),
  produtoId: int("produtoId").notNull(),
  produto: varchar("produto", { length: 100 }).notNull(),
  categoria: varchar("categoria", { length: 50 }), // Foto, Make, Cabelo, Outros
  quantidade: int("quantidade").default(1),
  valorUnitario: int("valorUnitario").notNull(), // em centavos
  ajusteValor: int("ajusteValor").default(0), // em centavos (positivo ou negativo)
  justificativa: varchar("justificativa", { length: 255 }), // obrigatório quando há ajuste
  valorTotal: int("valorTotal").notNull(), // em centavos (inclui ajuste)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ItemVenda = typeof itensVenda.$inferSelect;
export type InsertItemVenda = typeof itensVenda.$inferInsert;

// ==================== PAGAMENTOS ====================
export const pagamentos = mysqlTable("pagamentos", {
  id: int("id").autoincrement().primaryKey(),
  vendaId: int("vendaId").notNull(),
  tipo: mysqlEnum("tipo", ["pix", "dinheiro", "debito", "credito", "incluso_pacote"]).notNull(),
  valor: int("valor").notNull(), // em centavos
  valorLiquido: int("valorLiquido"), // em centavos (após taxas)
  bandeira: varchar("bandeira", { length: 50 }),
  parcelas: int("parcelas").default(1),
  cvNsu: varchar("cvNsu", { length: 50 }), // CV (NSU) do pagamento
  dataCompensacao: datetime("dataCompensacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Pagamento = typeof pagamentos.$inferSelect;
export type InsertPagamento = typeof pagamentos.$inferInsert;

// ==================== HISTÓRICO DE ALTERAÇÕES DE VENDAS ====================
export const historicoAlteracoesVendas = mysqlTable("historico_alteracoes_vendas", {
  id: int("id").autoincrement().primaryKey(),
  vendaId: int("vendaId").notNull(),
  tipo: mysqlEnum("tipo", ["exclusao", "edicao"]).notNull(),
  usuarioId: int("usuarioId").notNull(), // ID do usuário que fez a alteração
  dataAlteracao: timestamp("dataAlteracao").defaultNow().notNull(),
  motivo: text("motivo"), // Motivo da exclusão/edição
  camposAlterados: json("camposAlterados"), // JSON com campos alterados: {"campo": {"antes": valor, "depois": valor}}
  // Snapshot dos dados da venda no momento da alteração
  snapshotVenda: json("snapshotVenda"), // Dados completos da venda, formando e turma
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricoAlteracaoVenda = typeof historicoAlteracoesVendas.$inferSelect;
export type InsertHistoricoAlteracaoVenda = typeof historicoAlteracoesVendas.$inferInsert;

// ==================== TAXAS DE CARTÃO ====================
export const taxasCartao = mysqlTable("taxasCartao", {
  id: int("id").autoincrement().primaryKey(),
  tipoPagamento: varchar("tipoPagamento", { length: 20 }).notNull(), // 'debito' ou 'credito'
  bandeira: varchar("bandeira", { length: 50 }).notNull(),
  parcelas: int("parcelas").default(1).notNull(),
  taxaPercentual: int("taxaPercentual").notNull(), // valor * 10000 (ex: 3.03% = 303)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaxaCartao = typeof taxasCartao.$inferSelect;
export type InsertTaxaCartao = typeof taxasCartao.$inferInsert;

// ==================== CONFIGURAÇÕES DE MAQUIAGEM POR CIDADE ====================
export const configMaquiagem = mysqlTable("configMaquiagem", {
  id: int("id").autoincrement().primaryKey(),
  cidade: varchar("cidade", { length: 100 }).notNull(),
  valorMasculino: int("valorMasculino").notNull(), // em centavos (ex: R$ 18,15 = 1815)
  valorFeminino: int("valorFeminino").notNull(), // em centavos (ex: R$ 30,80 = 3080)
  valorComissaoFamilia: int("valorComissaoFamilia").default(3000), // R$ 30,00 = 3000 centavos
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConfigMaquiagem = typeof configMaquiagem.$inferSelect;
export type InsertConfigMaquiagem = typeof configMaquiagem.$inferInsert;

// ==================== CONFIGURAÇÕES DE MAQUIAGEM POR TURMA ====================
export const configMaquiagemTurma = mysqlTable("configMaquiagemTurma", {
  id: int("id").autoincrement().primaryKey(),
  turmaId: int("turmaId").notNull(),
  valorMasculino: int("valorMasculino").notNull(), // em centavos (ex: R$ 18,15 = 1815)
  valorFeminino: int("valorFeminino").notNull(), // em centavos (ex: R$ 30,80 = 3080)
  valorFamilia: int("valorFamilia").notNull(), // em centavos (ex: R$ 30,00 = 3000)
  semServicoFormando: boolean("semServicoFormando").default(false), // Turma sem serviço de maquiagem formando
  semServicoFamilia: boolean("semServicoFamilia").default(false), // Turma sem serviço de maquiagem família
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConfigMaquiagemTurma = typeof configMaquiagemTurma.$inferSelect;
export type InsertConfigMaquiagemTurma = typeof configMaquiagemTurma.$inferInsert;

// ==================== PRODUTOS ====================
export const produtos = mysqlTable("produtos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  descricao: text("descricao"),
  preco: int("preco").notNull(), // em centavos
  categoria: mysqlEnum("categoria", ["Foto", "Cabelo", "Outros"]).default("Outros"),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Produto = typeof produtos.$inferSelect;
export type InsertProduto = typeof produtos.$inferInsert;

// ==================== DESPESAS ====================
export const despesas = mysqlTable("despesas", {
  id: int("id").autoincrement().primaryKey(),
  numeroCi: varchar("numeroCi", { length: 20 }).notNull().unique(), // Formato: 001-2026
  tipoDespesa: mysqlEnum("tipoDespesa", ["operacional", "administrativo"]).notNull(),
  turmaId: int("turmaId"),
  eventoId: int("eventoId"),
  mesServico: varchar("mesServico", { length: 7 }), // Formato: YYYY-MM
  setorSolicitante: mysqlEnum("setorSolicitante", ["estudio", "fotografia", "becas"]).notNull(),
  fornecedorId: int("fornecedorId").notNull(),
  tipoServicoId: int("tipoServicoId"),
  detalhamento: text("detalhamento"),
  eReembolso: boolean("eReembolso").default(false),
  valorTotal: int("valorTotal").notNull(), // em centavos
  tipoPagamento: mysqlEnum("tipoPagamento", ["pix", "transferencia", "boleto", "dinheiro", "cartao"]),
  dadosPagamento: text("dadosPagamento"), // JSON com dados bancários editáveis
  tipoComprovante: mysqlEnum("tipoComprovante", ["nota_fiscal", "recibo", "cupom", "outros"]),
  dataLimitePagamento: datetime("dataLimitePagamento"),
  status: mysqlEnum("status", ["pendente", "apto", "pendente_nf", "cancelado"]).default("pendente"),
  pago: boolean("pago").default(false),
  dataPagamento: datetime("dataPagamento"),
  // Campos para Alimentação
  horarioSaida: varchar("horarioSaida", { length: 5 }), // Formato: HH:MM
  horarioRetorno: varchar("horarioRetorno", { length: 5 }), // Formato: HH:MM
  cafeDaManhaIncluso: boolean("cafeDaManhaIncluso").default(false),
  fornecedoresAlimentacao: text("fornecedoresAlimentacao"), // JSON array de IDs
  refeicoesCalculadas: text("refeicoesCalculadas"), // JSON com cálculos
  // Campos para Hospedagem
  fornecedorHospedagem: int("fornecedorHospedagem"),
  quartosHospedagem: text("quartosHospedagem"), // JSON com nomes por tipo de quarto
  valoresDiarias: text("valoresDiarias"), // JSON com valores por tipo
  diasAntes: int("diasAntes").default(0), // Dias extras antes do evento
  diasDepois: int("diasDepois").default(0), // Dias extras depois do evento
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Despesa = typeof despesas.$inferSelect;
export type InsertDespesa = typeof despesas.$inferInsert;

// ==================== ANEXOS DESPESAS ====================
export const anexosDespesas = mysqlTable("anexos_despesas", {
  id: int("id").autoincrement().primaryKey(),
  despesaId: int("despesaId").notNull(),
  tipoAnexo: mysqlEnum("tipoAnexo", ["comprovante_fiscal", "documento"]).notNull(),
  nomeArquivo: varchar("nomeArquivo", { length: 255 }).notNull(),
  urlArquivo: varchar("urlArquivo", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnexoDespesa = typeof anexosDespesas.$inferSelect;
export type InsertAnexoDespesa = typeof anexosDespesas.$inferInsert;


// ==================== TIPOS DE CENÁRIO ====================
export const tiposCenario = mysqlTable("tipos_cenario", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TipoCenario = typeof tiposCenario.$inferSelect;
export type InsertTipoCenario = typeof tiposCenario.$inferInsert;

// ==================== EXECUÇÃO FORMANDO (dados por formando no evento) ====================
export const execucaoFormando = mysqlTable("execucao_formando", {
  id: int("id").autoincrement().primaryKey(),
  eventoId: int("eventoId").notNull(),
  formandoId: int("formandoId").notNull(),
  status: mysqlEnum("status", ["apto", "inapto", "migracao"]).default("apto"),
  arquivoEntregue: boolean("arquivoEntregue").default(false),
  dataExecucao: timestamp("dataExecucao"), // Data que a execução foi realizada
  observacoes: text("observacoes"), // Observações gerais sobre a execução
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExecucaoFormando = typeof execucaoFormando.$inferSelect;
export type InsertExecucaoFormando = typeof execucaoFormando.$inferInsert;

// ==================== FOTOS FORMANDO (dados da câmera por formando) ====================
export const fotosFormando = mysqlTable("fotos_formando", {
  id: int("id").autoincrement().primaryKey(),
  execucaoFormandoId: int("execucaoFormandoId"),
  briefingFormandoId: int("briefingFormandoId"), // ID do formando no briefing (para sincronização Abordagem)
  cenarioId: int("cenarioId").notNull(), // ID do tipo de cenário
  fotografoId: int("fotografoId"), // ID do fornecedor fotógrafo
  horarioInicio: varchar("horarioInicio", { length: 10 }), // Ex: 08:00
  horarioTermino: varchar("horarioTermino", { length: 10 }), // Ex: 08:30
  numeroArquivos: int("numeroArquivos").default(0),
  observacao: text("observacao"),
  dataExecucao: timestamp("dataExecucao"), // Data em que o registro de foto foi criado
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FotoFormando = typeof fotosFormando.$inferSelect;
export type InsertFotoFormando = typeof fotosFormando.$inferInsert;

// ==================== SERVIÇOS EXECUÇÃO (Make e Cabelo por formando no evento) ====================
// Tabela para registrar serviços de maquiagem e cabelo realizados durante eventos
export const servicosExecucao = mysqlTable("servicos_execucao", {
  id: int("id").autoincrement().primaryKey(),
  eventoId: int("eventoId").notNull(),
  formandoId: int("formandoId").notNull(),
  tipoServico: mysqlEnum("tipoServico", ["make_formando", "make_familia", "cabelo_simples", "cabelo_combinado"]).notNull(),
  fornecedorId: int("fornecedorId"), // ID do fornecedor/prestadora (null para cabelo que é sempre a mesma)
  quantidade: int("quantidade").default(1).notNull(), // Para make_familia e cabelo pode ser múltiplo
  valorUnitario: int("valorUnitario").default(0), // Valor unitário em centavos
  valorTotal: int("valorTotal").default(0), // Valor total em centavos (quantidade * valorUnitario)
  fluxo: mysqlEnum("fluxo", ["pagar", "receber"]).notNull(), // Se você paga ou recebe
  tipoMake: mysqlEnum("tipoMake", ["masc", "fem"]), // Tipo de make do formando (Masc ou Fem)
  dataRealizacao: timestamp("dataRealizacao"), // Data que o serviço foi realizado
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ServicoExecucao = typeof servicosExecucao.$inferSelect;
export type InsertServicoExecucao = typeof servicosExecucao.$inferInsert;


// ==================== BRIEFING GRUPO (grupos de horários por evento) ====================
export const briefingGrupo = mysqlTable("briefing_grupo", {
  id: int("id").autoincrement().primaryKey(),
  eventoId: int("eventoId").notNull(),
  numero: int("numero").notNull(), // 1, 2, 3, 4...
  dataGrupo: timestamp("dataGrupo"), // data do grupo (preenchido pelo admin)
  horarioFormandos: varchar("horarioFormandos", { length: 20 }), // horário único dos formandos do grupo
  limiteFormandos: int("limiteFormandos").default(10), // limite de formandos por grupo
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BriefingGrupo = typeof briefingGrupo.$inferSelect;
export type InsertBriefingGrupo = typeof briefingGrupo.$inferInsert;

// ==================== BRIEFING FORMANDO (formandos vinculados aos grupos) ====================
export const briefingFormando = mysqlTable("briefing_formando", {
  id: int("id").autoincrement().primaryKey(),
  grupoId: int("grupoId").notNull(), // referencia briefing_grupo
  eventoId: int("eventoId").notNull(),
  formandoId: int("formandoId").notNull(),
  ordem: int("ordem").default(1), // ordem do formando no grupo
  horarioFamiliaSemServico: varchar("horarioFamiliaSemServico", { length: 20 }), // preenchido pelo admin - sem serviço
  horarioFamiliaComServico: varchar("horarioFamiliaComServico", { length: 20 }), // preenchido pelo admin - com serviço
  makeFormando: boolean("makeFormando").default(false), // preenchido pela comissão
  cabeloFormando: boolean("cabeloFormando").default(false), // preenchido pela comissão
  makeFamilia: boolean("makeFamilia").default(false), // preenchido pela comissão (legado)
  cabeloFamilia: boolean("cabeloFamilia").default(false), // preenchido pela comissão (legado)
  qtdMakeFamilia: int("qtdMakeFamilia").default(0), // quantidade de make família
  qtdCabeloSimples: int("qtdCabeloSimples").default(0), // quantidade de cabelo simples
  qtdCabeloCombinado: int("qtdCabeloCombinado").default(0), // quantidade de cabelo combinado
  qtdCabeloFamilia: int("qtdCabeloFamilia").default(0), // quantidade de cabelo família (legado)
  qtdFamilia: int("qtdFamilia").default(0), // quantidade de familiares/convidados
  qtdPets: int("qtdPets").default(0),
  peso: varchar("peso", { length: 10 }), // Peso do formando (ex: 70kg)
  altura: varchar("altura", { length: 10 }), // Altura do formando (ex: 1.75m)
  somenteGrupo: boolean("somenteGrupo").default(false), // só faz foto de grupo
  tamanhoBeca: varchar("tamanhoBeca", { length: 10 }), // PPP, PP, P, M, G, GG, GGG (sincronizado com Execução)
  observacao: text("observacao"),
  preenchidoPor: varchar("preenchidoPor", { length: 100 }), // nome de quem preencheu
  preenchidoEm: timestamp("preenchidoEm"),
  // ==================== CAMPOS DE ABORDAGEM (dados executados) ====================
  // Estes campos armazenam o que foi realmente executado na abordagem,
  // permitindo confronto com o planejado (campos acima)
  abordagemPacote: varchar("abordagemPacote", { length: 100 }), // Pacote executado
  abordagemMakeFormando: boolean("abordagemMakeFormando"), // Make formando executado
  abordagemCabeloFormando: boolean("abordagemCabeloFormando"), // Cabelo formando executado
  abordagemQtdCabeloSimples: int("abordagemQtdCabeloSimples"), // Cabelo simples executado
  abordagemQtdCabeloCombinado: int("abordagemQtdCabeloCombinado"), // Cabelo combinado executado
  abordagemQtdMakeFamilia: int("abordagemQtdMakeFamilia"), // Make família executado
  abordagemQtdFamilia: int("abordagemQtdFamilia"), // Quantidade família executado
  abordagemQtdPets: int("abordagemQtdPets"), // Quantidade pets executado
  abordagemPreenchidoPor: varchar("abordagemPreenchidoPor", { length: 100 }), // Quem preencheu a abordagem
  abordagemPreenchidoEm: timestamp("abordagemPreenchidoEm"), // Quando foi preenchido
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BriefingFormando = typeof briefingFormando.$inferSelect;
export type InsertBriefingFormando = typeof briefingFormando.$inferInsert;

// Manter tabelas antigas para compatibilidade (podem ser removidas depois)
export const horariosBriefing = mysqlTable("horarios_briefing", {
  id: int("id").autoincrement().primaryKey(),
  eventoId: int("eventoId").notNull(),
  grupo: int("grupo").notNull(),
  horarioFormando: varchar("horarioFormando", { length: 20 }).notNull(),
  horarioFamilia: varchar("horarioFamilia", { length: 20 }).notNull(),
  capacidade: int("capacidade").default(10),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HorarioBriefing = typeof horariosBriefing.$inferSelect;
export type InsertHorarioBriefing = typeof horariosBriefing.$inferInsert;

export const briefingEvento = mysqlTable("briefing_evento", {
  id: int("id").autoincrement().primaryKey(),
  eventoId: int("eventoId").notNull(),
  formandoId: int("formandoId").notNull(),
  grupo: int("grupo").default(1),
  horarioFormando: varchar("horarioFormando", { length: 20 }),
  horarioFamilia: varchar("horarioFamilia", { length: 20 }),
  makeFormando: boolean("makeFormando").default(false),
  cabeloFormando: boolean("cabeloFormando").default(false),
  makeFamilia: int("makeFamilia").default(0),
  cabeloFamilia: int("cabeloFamilia").default(0),
  qtdFamilia: int("qtdFamilia").default(0),
  qtdPets: int("qtdPets").default(0),
  somenteGrupo: boolean("somenteGrupo").default(false),
  observacao: text("observacao"),
  preenchidoPor: varchar("preenchidoPor", { length: 100 }),
  preenchidoEm: timestamp("preenchidoEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BriefingEvento = typeof briefingEvento.$inferSelect;
export type InsertBriefingEvento = typeof briefingEvento.$inferInsert;


// ==================== DESPESAS V2 (com fluxo de aprovação) ====================
export const despesasV2 = mysqlTable("despesas_v2", {
  id: int("id").autoincrement().primaryKey(),
  numeroCi: varchar("numeroCi", { length: 20 }).notNull().unique(), // Formato: 001/2026
  tipoDespesa: mysqlEnum("tipoDespesa", ["operacional", "administrativa"]).notNull(),
  mesServico: mysqlEnum("mesServico", [
    "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ]).notNull(),
  setorSolicitante: mysqlEnum("setorSolicitante", ["estudio", "fotografia", "becas"]).notNull(),
  fornecedorId: int("fornecedorId").notNull(),
  tipoServicoCompra: varchar("tipoServicoCompra", { length: 255 }), // Tipo de serviço/compra
  detalhamento: text("detalhamento").notNull(),
  eReembolso: boolean("eReembolso").default(false).notNull(),
  // Informações Financeiras
  valorTotal: int("valorTotal").notNull(), // em centavos
  tipoPagamento: mysqlEnum("tipoPagamento", ["pix", "cartao", "boleto", "dinheiro"]).notNull(),
  dadosPagamento: text("dadosPagamento").notNull(), // Dados para pagamento (PIX, conta, etc.)
  tipoComprovanteFiscal: mysqlEnum("tipoComprovanteFiscal", ["contrato", "nota_fiscal", "rpa"]),
  dataLimitePagamento: datetime("dataLimitePagamento"),
  // Local (para despesas operacionais)
  local: varchar("local", { length: 255 }),
  // Status de aprovação
  status: mysqlEnum("status", [
    "aguardando_aprovacao_gestor",
    "aguardando_aprovacao_gestor_geral",
    "aprovado_gestor",
    "aprovado_gestor_geral",
    "liquidado"
  ]).default("aguardando_aprovacao_gestor").notNull(),
  // Liquidação
  dataLiquidacao: datetime("dataLiquidacao"),
  comprovanteUrl: varchar("comprovanteUrl", { length: 500 }), // URL do comprovante de pagamento
  // Usuário que criou
  criadoPorId: int("criadoPorId").notNull(),
  criadoPorNome: varchar("criadoPorNome", { length: 255 }),
  // Soft delete
  excluido: boolean("excluido").default(false).notNull(),
  excluidoPor: int("excluidoPor"),
  excluidoEm: timestamp("excluidoEm"),
  motivoExclusao: text("motivoExclusao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DespesaV2 = typeof despesasV2.$inferSelect;
export type InsertDespesaV2 = typeof despesasV2.$inferInsert;

// ==================== DESPESAS V2 - TURMAS (vínculo múltiplo) ====================
export const despesasV2Turmas = mysqlTable("despesas_v2_turmas", {
  id: int("id").autoincrement().primaryKey(),
  despesaId: int("despesaId").notNull(),
  turmaId: int("turmaId").notNull(),
  tipoEvento: varchar("tipoEvento", { length: 100 }), // Tipo de evento da turma
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DespesaV2Turma = typeof despesasV2Turmas.$inferSelect;
export type InsertDespesaV2Turma = typeof despesasV2Turmas.$inferInsert;

// ==================== DESPESAS V2 - DATAS (datas de realização múltiplas) ====================
export const despesasV2Datas = mysqlTable("despesas_v2_datas", {
  id: int("id").autoincrement().primaryKey(),
  despesaId: int("despesaId").notNull(),
  dataRealizacao: datetime("dataRealizacao").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DespesaV2Data = typeof despesasV2Datas.$inferSelect;
export type InsertDespesaV2Data = typeof despesasV2Datas.$inferInsert;

// ==================== DESPESAS V2 - HISTÓRICO (log de aprovações) ====================
export const despesasV2Historico = mysqlTable("despesas_v2_historico", {
  id: int("id").autoincrement().primaryKey(),
  despesaId: int("despesaId").notNull(),
  acao: mysqlEnum("acao", [
    "criacao",
    "aprovacao_gestor",
    "rejeicao_gestor",
    "aprovacao_gestor_geral",
    "rejeicao_gestor_geral",
    "edicao",
    "liquidacao"
  ]).notNull(),
  statusAnterior: varchar("statusAnterior", { length: 50 }),
  statusNovo: varchar("statusNovo", { length: 50 }),
  justificativa: text("justificativa"), // Obrigatório para rejeições
  usuarioId: int("usuarioId").notNull(),
  usuarioNome: varchar("usuarioNome", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DespesaV2Historico = typeof despesasV2Historico.$inferSelect;
export type InsertDespesaV2Historico = typeof despesasV2Historico.$inferInsert;

// ==================== DESPESAS V2 - ANEXOS ====================
export const despesasV2Anexos = mysqlTable("despesas_v2_anexos", {
  id: int("id").autoincrement().primaryKey(),
  despesaId: int("despesaId").notNull(),
  tipoAnexo: mysqlEnum("tipoAnexo", ["comprovante_fiscal", "documento", "comprovante_liquidacao"]).notNull(),
  nomeArquivo: varchar("nomeArquivo", { length: 255 }).notNull(),
  urlArquivo: varchar("urlArquivo", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DespesaV2Anexo = typeof despesasV2Anexos.$inferSelect;
export type InsertDespesaV2Anexo = typeof despesasV2Anexos.$inferInsert;

// ==================== SEQUÊNCIA CI (para controle do número automático) ====================
export const sequenciaCi = mysqlTable("sequencia_ci", {
  id: int("id").autoincrement().primaryKey(),
  ano: int("ano").notNull().unique(),
  ultimoNumero: int("ultimoNumero").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SequenciaCi = typeof sequenciaCi.$inferSelect;
export type InsertSequenciaCi = typeof sequenciaCi.$inferInsert;

// ==================== REUNIÕES ATENDIMENTO ====================
export const reunioes = mysqlTable("reunioes", {
  id: int("id").autoincrement().primaryKey(),
  turmaId: int("turmaId").notNull(),
  data: date("data").notNull(),
  horario: varchar("horario", { length: 5 }).notNull(), // HH:MM
  tiposEvento: text("tiposEvento").notNull(), // JSON array de IDs de tipos de evento
  tipoReuniao: mysqlEnum("tipoReuniao", ["Presencial", "Online"]).notNull(),
  quantidadeReunioes: int("quantidadeReunioes").default(0),
  dataResumo: date("dataResumo"), // Data de envio do resumo
  alinhamento: boolean("alinhamento").default(false), // Checkbox
  dataBriefing: date("dataBriefing"), // Data de envio do briefing
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Reuniao = typeof reunioes.$inferSelect;
export type InsertReuniao = typeof reunioes.$inferInsert;

// ==================== PERMISSÕES ====================
export const permissoes = mysqlTable("permissoes", {
  id: int("id").autoincrement().primaryKey(),
  role: varchar("role", { length: 100 }).notNull(),
  secao: varchar("secao", { length: 50 }).notNull(), // dashboard, turmas, eventos, abordagem, execucao, vendas, reunioes, despesas, relatorios, briefing, becas, configuracoes
  visualizar: boolean("visualizar").default(false).notNull(),
  inserir: boolean("inserir").default(false).notNull(),
  excluir: boolean("excluir").default(false).notNull(),
  tipoUsuarioId: int("tipoUsuarioId").notNull().default(1).references(() => tiposUsuario.id, { onDelete: 'cascade' }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Permissao = typeof permissoes.$inferSelect;
export type InsertPermissao = typeof permissoes.$inferInsert;

// ==================== PERMISSÕES RELATÓRIOS (GRANULAR) ====================
export const permissoesRelatorios = mysqlTable("permissoes_relatorios", {
  id: int("id").autoincrement().primaryKey(),
  role: varchar("role", { length: 100 }).notNull(),
  aba: mysqlEnum("aba", ["despesas", "emissao_nf", "servicos_make_cabelo", "execucao", "compensacao_bancaria", "vendas_excluidas", "observacoes", "fechamentos_mensais"]).notNull(),
  visualizar: boolean("visualizar").default(false).notNull(),
  inserir: boolean("inserir").default(false).notNull(),
  excluir: boolean("excluir").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PermissaoRelatorio = typeof permissoesRelatorios.$inferSelect;
export type InsertPermissaoRelatorio = typeof permissoesRelatorios.$inferInsert;

// ==================== PERMISSÕES CONFIGURAÇÕES (GRANULAR) ====================
export const permissoesConfiguracoes = mysqlTable("permissoes_configuracoes", {
  id: int("id").autoincrement().primaryKey(),
  role: varchar("role", { length: 100 }).notNull(),
  aba: mysqlEnum("aba", ["instituicoes", "cursos", "cidades", "locais", "tipos_evento", "tipos_servico", "fornecedores", "tabela_preco", "taxas_cartao", "produtos", "maquiagem"]).notNull(),
  visualizar: boolean("visualizar").default(false).notNull(),
  inserir: boolean("inserir").default(false).notNull(),
  excluir: boolean("excluir").default(false).notNull(),
  tipoUsuarioId: int("tipoUsuarioId").notNull().default(1).references(() => tiposUsuario.id, { onDelete: 'cascade' }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PermissaoConfiguracao = typeof permissoesConfiguracoes.$inferSelect;
export type InsertPermissaoConfiguracao = typeof permissoesConfiguracoes.$inferInsert;

// ==================== PERMISSÕES CERIMONIAIS (ACESSO POR TURMA) ====================
export const usuarioTurmas = mysqlTable("usuario_turmas", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // ID do usuário (deve ser role=cerimonial)
  turmaId: int("turmaId").notNull(), // ID da turma autorizada
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UsuarioTurma = typeof usuarioTurmas.$inferSelect;
export type InsertUsuarioTurma = typeof usuarioTurmas.$inferInsert;

// ==================== HISTÓRICO DE OBSERVAÇÕES ====================
export const historicoObservacoes = mysqlTable("historico_observacoes", {
  id: int("id").autoincrement().primaryKey(),
  eventoId: int("eventoId").notNull(),
  userId: int("userId").notNull(),
  observacao: text("observacao").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricoObservacao = typeof historicoObservacoes.$inferSelect;
export type InsertHistoricoObservacao = typeof historicoObservacoes.$inferInsert;

// ==================== NOTIFICAÇÕES ====================
export const notificacoes = mysqlTable("notificacoes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Destinatário da notificação
  tipo: mysqlEnum("tipo", [
    "despesa_criada",
    "despesa_aprovada_gestor",
    "despesa_aprovada_gestor_geral",
    "despesa_rejeitada_gestor",
    "despesa_rejeitada_gestor_geral",
    "despesa_liquidada",
    "turma_criada",
    "evento_criado",
    "evento_editado",
    "evento_excluido",
    "venda_editada",
    "venda_excluida",
    "lembrete_evento_5dias",
    "lembrete_evento_2dias"
  ]).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  mensagem: text("mensagem").notNull(),
  despesaId: int("despesaId"), // Referência à despesa (se aplicável)
  turmaId: int("turmaId"), // Referência à turma (se aplicável)
  eventoId: int("eventoId"), // Referência ao evento (se aplicável)
  vendaId: int("vendaId"), // Referência à venda (se aplicável)
  lida: boolean("lida").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notificacao = typeof notificacoes.$inferSelect;
export type InsertNotificacao = typeof notificacoes.$inferInsert;


// ==================== FECHAMENTOS MENSAIS ====================
export const fechamentosMensais = mysqlTable("fechamentos_mensais", {
  id: int("id").autoincrement().primaryKey(),
  mes: int("mes").notNull(), // 1-12
  ano: int("ano").notNull(), // 2025, 2026, etc
  tipo: mysqlEnum("tipo", ["vendas", "conta_bancaria"]).notNull(),
  
  // RECEITA
  receitaCartoes: decimal("receitaCartoes", { precision: 15, scale: 2 }).default("0").notNull(),
  receitaPix: decimal("receitaPix", { precision: 15, scale: 2 }).default("0").notNull(),
  receitaDinheiro: decimal("receitaDinheiro", { precision: 15, scale: 2 }).default("0").notNull(),
  receitaRendimento: decimal("receitaRendimento", { precision: 15, scale: 2 }).default("0").notNull(),
  receitaPlataforma: decimal("receitaPlataforma", { precision: 15, scale: 2 }).default("0").notNull(),
  receitaPagseguro: decimal("receitaPagseguro", { precision: 15, scale: 2 }).default("0").notNull(),
  receitaSantander: decimal("receitaSantander", { precision: 15, scale: 2 }).default("0").notNull(),
  
  // DESPESA
  despesaTarifaCartao: decimal("despesaTarifaCartao", { precision: 15, scale: 2 }).default("0").notNull(),
  despesaOutrasTarifas: decimal("despesaOutrasTarifas", { precision: 15, scale: 2 }).default("0").notNull(),
  despesaImpostos: decimal("despesaImpostos", { precision: 15, scale: 2 }).default("0").notNull(),
  despesaMaquiadora: decimal("despesaMaquiadora", { precision: 15, scale: 2 }).default("0").notNull(),
  despesaOperacaoFora: decimal("despesaOperacaoFora", { precision: 15, scale: 2 }).default("0").notNull(),
  despesaInvestimentos: decimal("despesaInvestimentos", { precision: 15, scale: 2 }).default("0").notNull(),
  despesaEstorno: decimal("despesaEstorno", { precision: 15, scale: 2 }).default("0").notNull(),
  despesaTransfSantander: decimal("despesaTransfSantander", { precision: 15, scale: 2 }).default("0").notNull(),
  
  // IMPOSTOS - Detalhamento
  impostosIss: decimal("impostosIss", { precision: 15, scale: 2 }).default("0").notNull(),
  impostosPis: decimal("impostosPis", { precision: 15, scale: 2 }).default("0").notNull(),
  impostosCofins: decimal("impostosCofins", { precision: 15, scale: 2 }).default("0").notNull(),
  impostosCsll: decimal("impostosCsll", { precision: 15, scale: 2 }).default("0").notNull(),
  impostosIrpj: decimal("impostosIrpj", { precision: 15, scale: 2 }).default("0").notNull(),
  
  // IRPJ - Alíquotas
  aliquotaIrpjEstimada: decimal("aliquotaIrpjEstimada", { precision: 5, scale: 2 }).default("0").notNull(), // %
  aliquotaIrpjReal: decimal("aliquotaIrpjReal", { precision: 5, scale: 2 }).default("0").notNull(), // %
  
  // Controle
  criadoPorId: int("criadoPorId").notNull(),
  criadoPorNome: varchar("criadoPorNome", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FechamentoMensal = typeof fechamentosMensais.$inferSelect;
export type InsertFechamentoMensal = typeof fechamentosMensais.$inferInsert;

// ==================== EXTRATOS BANCÁRIOS (uploads) ====================
export const extratosUploads = mysqlTable("extratos_uploads", {
  id: int("id").autoincrement().primaryKey(),
  fechamentoId: int("fechamentoId").notNull(),
  tipo: mysqlEnum("tipo", ["itau_entrada", "itau_saida", "rede_recebimentos"]).notNull(),
  nomeArquivo: varchar("nomeArquivo", { length: 255 }).notNull(),
  urlArquivo: text("urlArquivo").notNull(), // S3 URL
  processado: boolean("processado").default(false).notNull(),
  dadosProcessados: text("dadosProcessados"), // JSON com resultados do processamento
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExtratoUpload = typeof extratosUploads.$inferSelect;
export type InsertExtratoUpload = typeof extratosUploads.$inferInsert;

// ==================== FECHAMENTOS DIÁRIOS ====================
export const fechamentosDiarios = mysqlTable("fechamentos_diarios", {
  id: int("id").autoincrement().primaryKey(),
  data: date("data").notNull(), // Data do fechamento
  status: mysqlEnum("status", ["pendente", "conciliado", "com_divergencia"]).default("pendente").notNull(),
  
  // Totais do Sistema
  totalSistema: int("totalSistema").notNull(), // em centavos - total de vendas registradas
  totalDinheiro: int("totalDinheiro").default(0).notNull(),
  totalPix: int("totalPix").default(0).notNull(),
  totalDebito: int("totalDebito").default(0).notNull(),
  totalCreditoVista: int("totalCreditoVista").default(0).notNull(),
  totalCreditoParcelado: int("totalCreditoParcelado").default(0).notNull(),
  
  // Totais da Rede (após upload)
  totalRede: int("totalRede"), // em centavos
  totalRedeDebito: int("totalRedeDebito"),
  totalRedeCredito: int("totalRedeCredito"),
  
  // Divergências
  quantidadeVendasOk: int("quantidadeVendasOk").default(0),
  quantidadeDivergencias: int("quantidadeDivergencias").default(0),
  quantidadeNaoLancadas: int("quantidadeNaoLancadas").default(0),
  quantidadeFantasma: int("quantidadeFantasma").default(0),
  
  // Observações e controle
  observacoes: text("observacoes"),
  conciliadoPorId: int("conciliadoPorId"),
  conciliadoPorNome: varchar("conciliadoPorNome", { length: 255 }),
  conciliadoEm: timestamp("conciliadoEm"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FechamentoDiario = typeof fechamentosDiarios.$inferSelect;
export type InsertFechamentoDiario = typeof fechamentosDiarios.$inferInsert;

// ==================== TRANSAÇÕES DA REDE ====================
export const transacoesRede = mysqlTable("transacoes_rede", {
  id: int("id").autoincrement().primaryKey(),
  fechamentoDiarioId: int("fechamentoDiarioId").notNull(),
  
  // Dados do CSV da Rede
  dataVenda: datetime("dataVenda").notNull(),
  horaVenda: varchar("horaVenda", { length: 10 }),
  statusVenda: varchar("statusVenda", { length: 50 }), // aprovada, cancelada
  valorOriginal: int("valorOriginal").notNull(), // em centavos
  valorAtualizado: int("valorAtualizado"), // em centavos
  valorLiquido: int("valorLiquido"), // em centavos
  
  modalidade: varchar("modalidade", { length: 20 }), // débito, crédito
  tipo: varchar("tipo", { length: 100 }), // à vista, parcelado
  numeroParcelas: int("numeroParcelas").default(1),
  bandeira: varchar("bandeira", { length: 50 }),
  
  nsuCv: varchar("nsuCv", { length: 50 }).notNull(), // NSU/CV - chave para matching
  
  // Taxas
  taxaMdr: varchar("taxaMdr", { length: 20 }),
  valorMdr: int("valorMdr"), // em centavos
  
  // Dados adicionais
  numeroAutorizacao: varchar("numeroAutorizacao", { length: 50 }),
  numeroEstabelecimento: varchar("numeroEstabelecimento", { length: 50 }),
  numeroCartao: varchar("numeroCartao", { length: 50 }),
  tid: varchar("tid", { length: 50 }),
  
  // Matching com vendas do sistema
  vendaId: int("vendaId"), // NULL se não encontrou match
  pagamentoId: int("pagamentoId"), // NULL se não encontrou match
  statusMatching: mysqlEnum("statusMatching", ["ok", "divergencia_valor", "nao_lancado", "duplicado"]).default("nao_lancado"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TransacaoRede = typeof transacoesRede.$inferSelect;
export type InsertTransacaoRede = typeof transacoesRede.$inferInsert;

// ==================== DIVERGÊNCIAS DE FECHAMENTO ====================
export const divergenciasFechamento = mysqlTable("divergencias_fechamento", {
  id: int("id").autoincrement().primaryKey(),
  fechamentoDiarioId: int("fechamentoDiarioId").notNull(),
  
  tipoDivergencia: mysqlEnum("tipoDivergencia", [
    "valor_diferente",      // Valores não batem
    "nao_lancado",          // Tem na Rede mas não tem no sistema
    "venda_fantasma",       // Tem no sistema mas não tem na Rede
    "data_incorreta"        // Transação em data diferente
  ]).notNull(),
  
  // Referências
  vendaId: int("vendaId"),
  pagamentoId: int("pagamentoId"),
  transacaoRedeId: int("transacaoRedeId"),
  
  // Valores
  valorEsperado: int("valorEsperado"), // em centavos
  valorEncontrado: int("valorEncontrado"), // em centavos
  diferenca: int("diferenca"), // em centavos
  
  // Detalhes
  cvNsu: varchar("cvNsu", { length: 50 }),
  descricao: text("descricao"),
  
  // Resolução
  statusResolucao: mysqlEnum("statusResolucao", [
    "pendente",
    "aprovado",           // Divergência aprovada/justificada
    "corrigido",          // Venda lançada/corrigida
    "ignorado"            // Divergência ignorada
  ]).default("pendente").notNull(),
  
  justificativa: text("justificativa"),
  resolvidoPorId: int("resolvidoPorId"),
  resolvidoPorNome: varchar("resolvidoPorNome", { length: 255 }),
  resolvidoEm: timestamp("resolvidoEm"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DivergenciaFechamento = typeof divergenciasFechamento.$inferSelect;
export type InsertDivergenciaFechamento = typeof divergenciasFechamento.$inferInsert;
