import { getDb } from "../server/db.js";
import { tiposUsuario, permissoes, permissoesRelatorios, permissoesConfiguracoes } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

const db = await getDb();

console.log("🔍 Verificando tipos de usuário sem permissões...\n");

// Buscar todos os tipos de usuário
const tipos = await db.select().from(tiposUsuario);
console.log(`📋 Encontrados ${tipos.length} tipos de usuário\n`);

// Seções principais do sistema
const secoes = [
  "home", "turmas", "eventos", "abordagem", "execucao", 
  "vendas", "reunioes", "servicos", "financeiro", "despesas", 
  "relatorios", "briefing", "becas", "configuracoes"
];

// Abas de relatórios
const abasRelatorios = [
  "despesas", "emissao_nf", "servicos_make_cabelo", "execucao",
  "compensacao_bancaria", "vendas_excluidas", "observacoes", "fechamentos_mensais"
];

// Abas de configurações
const abasConfiguracoes = [
  "instituicoes", "cursos", "cidades", "locais", "tipos_evento",
  "tipos_servico", "fornecedores", "tabela_preco", "taxas_cartao",
  "produtos", "maquiagem"
];

for (const tipo of tipos) {
  const roleName = tipo.nome;
  console.log(`\n🔧 Processando: ${roleName}`);
  
  // Verificar permissões gerais
  const permsExistentes = await db
    .select()
    .from(permissoes)
    .where(eq(permissoes.role, roleName));
  
  if (permsExistentes.length === 0) {
    console.log(`  ⚠️  Nenhuma permissão geral encontrada. Criando...`);
    for (const secao of secoes) {
      await db.insert(permissoes).values({
        role: roleName,
        secao: secao,
        visualizar: false,
        inserir: false,
        excluir: false,
      });
    }
    console.log(`  ✅ ${secoes.length} permissões gerais criadas`);
  } else {
    console.log(`  ✓ ${permsExistentes.length} permissões gerais já existem`);
  }
  
  // Verificar permissões de relatórios
  const permsRelExistentes = await db
    .select()
    .from(permissoesRelatorios)
    .where(eq(permissoesRelatorios.role, roleName));
  
  if (permsRelExistentes.length === 0) {
    console.log(`  ⚠️  Nenhuma permissão de relatório encontrada. Criando...`);
    for (const aba of abasRelatorios) {
      await db.insert(permissoesRelatorios).values({
        role: roleName,
        aba: aba,
        visualizar: false,
        inserir: false,
        excluir: false,
      });
    }
    console.log(`  ✅ ${abasRelatorios.length} permissões de relatório criadas`);
  } else {
    console.log(`  ✓ ${permsRelExistentes.length} permissões de relatório já existem`);
  }
  
  // Verificar permissões de configurações
  const permsConfExistentes = await db
    .select()
    .from(permissoesConfiguracoes)
    .where(eq(permissoesConfiguracoes.role, roleName));
  
  if (permsConfExistentes.length === 0) {
    console.log(`  ⚠️  Nenhuma permissão de configuração encontrada. Criando...`);
    for (const aba of abasConfiguracoes) {
      await db.insert(permissoesConfiguracoes).values({
        role: roleName,
        aba: aba,
        visualizar: false,
        inserir: false,
        excluir: false,
      });
    }
    console.log(`  ✅ ${abasConfiguracoes.length} permissões de configuração criadas`);
  } else {
    console.log(`  ✓ ${permsConfExistentes.length} permissões de configuração já existem`);
  }
}

console.log("\n\n✨ Correção concluída com sucesso!");
process.exit(0);
