import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const SECOES = [
  "home",
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
  "permissoes_cerimoniais",
  "configuracoes"
];

async function main() {
  console.log('🔄 Conectando ao banco de dados...');
  
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  try {
    // 1. Buscar todos os tipos de usuário
    console.log('📋 Buscando tipos de usuário...');
    const [tiposUsuario] = await connection.query('SELECT id, nome FROM tipos_usuario WHERE ativo = 1 ORDER BY id');
    console.log(`✅ Encontrados ${tiposUsuario.length} tipos de usuário`);

    // 2. Verificar permissões existentes
    console.log('\n📊 Verificando permissões existentes...');
    const [permissoesExistentes] = await connection.query('SELECT COUNT(*) as total FROM permissoes');
    console.log(`ℹ️  Permissões existentes: ${permissoesExistentes[0].total}`);

    // 3. Para cada tipo de usuário, criar permissões para todas as seções
    let permissoesCriadas = 0;
    let permissoesJaExistentes = 0;

    for (const tipo of tiposUsuario) {
      console.log(`\n🔧 Processando tipo: ${tipo.nome} (ID: ${tipo.id})`);
      
      for (const secao of SECOES) {
        // Gerar o role slug (lowercase com underscores)
        const roleSlug = tipo.nome.toLowerCase().replace(/\s+/g, '_');
        
        // Verificar se já existe permissão para este role + seção (pela constraint unique)
        const [existente] = await connection.query(
          'SELECT id FROM permissoes WHERE role = ? AND secao = ?',
          [roleSlug, secao]
        );

        if (existente.length > 0) {
          permissoesJaExistentes++;
          continue;
        }

        // Definir permissões padrão baseado no tipo de usuário
        let visualizar = false;
        let inserir = false;
        let excluir = false;

        // Administrador tem todas as permissões
        if (tipo.nome === 'Administrador') {
          visualizar = true;
          inserir = true;
          excluir = true;
        }
        // Gestor tem permissões amplas
        else if (tipo.nome === 'Gestor') {
          visualizar = true;
          inserir = true;
          excluir = false; // Pode não ter permissão de excluir em algumas seções
        }
        // Financeiro tem acesso às seções financeiras
        else if (tipo.nome === 'Financeiro') {
          if (['home', 'vendas', 'financeiro', 'despesas', 'relatorios'].includes(secao)) {
            visualizar = true;
            inserir = true;
            excluir = false;
          }
        }
        // Coordenador tem acesso operacional
        else if (tipo.nome === 'Coordenador') {
          if (['home', 'turmas', 'eventos', 'abordagem', 'execucao', 'vendas', 'servicos'].includes(secao)) {
            visualizar = true;
            inserir = true;
            excluir = false;
          }
        }
        // Logística tem acesso a eventos e logística
        else if (tipo.nome === 'Logística') {
          if (['home', 'eventos', 'despesas'].includes(secao)) {
            visualizar = true;
            inserir = true;
            excluir = false;
          }
        }
        // Cerimonial tem acesso limitado
        else if (tipo.nome === 'Cerimonial') {
          if (['home', 'turmas', 'eventos', 'briefing'].includes(secao)) {
            visualizar = true;
            inserir = false;
            excluir = false;
          }
        }
        // Beca tem acesso à seção de becas
        else if (tipo.nome === 'Beca') {
          if (['home', 'turmas', 'becas'].includes(secao)) {
            visualizar = true;
            inserir = true;
            excluir = false;
          }
        }
        // Armazenamento tem acesso limitado
        else if (tipo.nome === 'Armazenamento') {
          if (['home', 'turmas', 'eventos'].includes(secao)) {
            visualizar = true;
            inserir = false;
            excluir = false;
          }
        }
        // Controle tem acesso a várias seções
        else if (tipo.nome === 'Controle') {
          if (['home', 'turmas', 'eventos', 'abordagem', 'execucao', 'vendas'].includes(secao)) {
            visualizar = true;
            inserir = false;
            excluir = false;
          }
        }

        // Criar permissão
        await connection.query(
          'INSERT INTO permissoes (role, secao, visualizar, inserir, excluir, tipoUsuarioId) VALUES (?, ?, ?, ?, ?, ?)',
          [roleSlug, secao, visualizar, inserir, excluir, tipo.id]
        );
        
        permissoesCriadas++;
      }
    }

    console.log('\n✅ Seed de permissões concluído!');
    console.log(`📊 Estatísticas:`);
    console.log(`   - Permissões criadas: ${permissoesCriadas}`);
    console.log(`   - Permissões já existentes: ${permissoesJaExistentes}`);
    console.log(`   - Total de tipos de usuário: ${tiposUsuario.length}`);
    console.log(`   - Total de seções: ${SECOES.length}`);
    console.log(`   - Total esperado: ${tiposUsuario.length * SECOES.length}`);

  } catch (error) {
    console.error('❌ Erro ao executar seed:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('\n🔌 Conexão com banco de dados encerrada');
  }
}

main()
  .then(() => {
    console.log('\n✨ Seed executado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });
