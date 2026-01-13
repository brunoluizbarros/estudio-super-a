import mysql from 'mysql2/promise';
import 'dotenv/config';

const SECOES = [
  "dashboard",
  "turmas",
  "eventos",
  "abordagem",
  "execucao",
  "vendas",
  "reunioes",
  "servicos",
  "financeiro",
  "despesas",
  "relatorios",
  "briefing",
  "becas",
  "configuracoes",
];

// Permissões padrão por role
const PERMISSOES_PADRAO = {
  administrador: {
    // Administrador tem todas as permissões
    all: { visualizar: true, inserir: true, excluir: true },
  },
  gestor: {
    // Gestor tem quase todas as permissões
    all: { visualizar: true, inserir: true, excluir: true },
  },
  coordenador: {
    // Coordenador pode visualizar e inserir, mas não excluir
    all: { visualizar: true, inserir: true, excluir: false },
  },
  cerimonial: {
    // Cerimonial foca em eventos e execução
    dashboard: { visualizar: true, inserir: false, excluir: false },
    turmas: { visualizar: true, inserir: false, excluir: false },
    eventos: { visualizar: true, inserir: true, excluir: false },
    execucao: { visualizar: true, inserir: true, excluir: false },
    reunioes: { visualizar: true, inserir: true, excluir: false },
    relatorios: { visualizar: true, inserir: false, excluir: false },
  },
  beca: {
    // Beca foca em gerenciar becas
    dashboard: { visualizar: true, inserir: false, excluir: false },
    turmas: { visualizar: true, inserir: false, excluir: false },
    eventos: { visualizar: true, inserir: false, excluir: false },
    becas: { visualizar: true, inserir: true, excluir: false },
    relatorios: { visualizar: true, inserir: false, excluir: false },
  },
  logistica: {
    // Logística foca em eventos e serviços
    dashboard: { visualizar: true, inserir: false, excluir: false },
    turmas: { visualizar: true, inserir: false, excluir: false },
    eventos: { visualizar: true, inserir: true, excluir: false },
    servicos: { visualizar: true, inserir: true, excluir: false },
    relatorios: { visualizar: true, inserir: false, excluir: false },
  },
  armazenamento: {
    // Armazenamento foca em produtos e serviços
    dashboard: { visualizar: true, inserir: false, excluir: false },
    turmas: { visualizar: true, inserir: false, excluir: false },
    eventos: { visualizar: true, inserir: false, excluir: false },
    servicos: { visualizar: true, inserir: true, excluir: false },
    relatorios: { visualizar: true, inserir: false, excluir: false },
  },
  financeiro: {
    // Financeiro foca em vendas, despesas e relatórios financeiros
    dashboard: { visualizar: true, inserir: false, excluir: false },
    turmas: { visualizar: true, inserir: false, excluir: false },
    eventos: { visualizar: true, inserir: false, excluir: false },
    vendas: { visualizar: true, inserir: true, excluir: false },
    financeiro: { visualizar: true, inserir: true, excluir: false },
    despesas: { visualizar: true, inserir: true, excluir: false },
    relatorios: { visualizar: true, inserir: false, excluir: false },
  },
};

async function seedPermissoes() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    console.log('🌱 Populando permissões padrão...');

    for (const [role, permissoes] of Object.entries(PERMISSOES_PADRAO)) {
      console.log(`\n📋 Configurando permissões para: ${role}`);

      if (permissoes.all) {
        // Se tem "all", aplicar para todas as seções
        for (const secao of SECOES) {
          await connection.execute(
            `INSERT INTO permissoes (role, secao, visualizar, inserir, excluir)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             visualizar = VALUES(visualizar),
             inserir = VALUES(inserir),
             excluir = VALUES(excluir)`,
            [role, secao, permissoes.all.visualizar, permissoes.all.inserir, permissoes.all.excluir]
          );
          console.log(`  ✓ ${secao}`);
        }
      } else {
        // Se não tem "all", aplicar permissões específicas
        for (const [secao, perm] of Object.entries(permissoes)) {
          await connection.execute(
            `INSERT INTO permissoes (role, secao, visualizar, inserir, excluir)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             visualizar = VALUES(visualizar),
             inserir = VALUES(inserir),
             excluir = VALUES(excluir)`,
            [role, secao, perm.visualizar, perm.inserir, perm.excluir]
          );
          console.log(`  ✓ ${secao}`);
        }
      }
    }

    console.log('\n✅ Permissões padrão populadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao popular permissões:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedPermissoes();
