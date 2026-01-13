import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const PERMISSOES_RELATORIOS = {
  administrador: {
    // Administrador tem acesso total a todos os relatórios
    despesas: { visualizar: true, inserir: true, excluir: true },
    emissao_nf: { visualizar: true, inserir: true, excluir: true },
    servicos_make_cabelo: { visualizar: true, inserir: true, excluir: true },
    execucao: { visualizar: true, inserir: true, excluir: true },
  },
  gestor: {
    // Gestor tem acesso total a todos os relatórios
    despesas: { visualizar: true, inserir: true, excluir: true },
    emissao_nf: { visualizar: true, inserir: true, excluir: true },
    servicos_make_cabelo: { visualizar: true, inserir: true, excluir: true },
    execucao: { visualizar: true, inserir: true, excluir: true },
  },
  coordenador: {
    // Coordenador pode visualizar e inserir, mas não excluir
    despesas: { visualizar: true, inserir: true, excluir: false },
    emissao_nf: { visualizar: true, inserir: true, excluir: false },
    servicos_make_cabelo: { visualizar: true, inserir: true, excluir: false },
    execucao: { visualizar: true, inserir: true, excluir: false },
  },
  cerimonial: {
    // Cerimonial foca em execução
    despesas: { visualizar: false, inserir: false, excluir: false },
    emissao_nf: { visualizar: false, inserir: false, excluir: false },
    servicos_make_cabelo: { visualizar: false, inserir: false, excluir: false },
    execucao: { visualizar: true, inserir: false, excluir: false },
  },
  beca: {
    // Beca não tem acesso a relatórios
    despesas: { visualizar: false, inserir: false, excluir: false },
    emissao_nf: { visualizar: false, inserir: false, excluir: false },
    servicos_make_cabelo: { visualizar: false, inserir: false, excluir: false },
    execucao: { visualizar: false, inserir: false, excluir: false },
  },
  logistica: {
    // Logística foca em serviços make/cabelo
    despesas: { visualizar: false, inserir: false, excluir: false },
    emissao_nf: { visualizar: false, inserir: false, excluir: false },
    servicos_make_cabelo: { visualizar: true, inserir: false, excluir: false },
    execucao: { visualizar: false, inserir: false, excluir: false },
  },
  armazenamento: {
    // Armazenamento não tem acesso a relatórios
    despesas: { visualizar: false, inserir: false, excluir: false },
    emissao_nf: { visualizar: false, inserir: false, excluir: false },
    servicos_make_cabelo: { visualizar: false, inserir: false, excluir: false },
    execucao: { visualizar: false, inserir: false, excluir: false },
  },
  financeiro: {
    // Financeiro tem acesso a despesas e emissão de NF
    despesas: { visualizar: true, inserir: true, excluir: false },
    emissao_nf: { visualizar: true, inserir: true, excluir: false },
    servicos_make_cabelo: { visualizar: false, inserir: false, excluir: false },
    execucao: { visualizar: false, inserir: false, excluir: false },
  },
};

async function seedPermissoesRelatorios() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  console.log("🌱 Populando permissões de relatórios...");

  try {
    // Limpar permissões existentes
    await connection.execute("DELETE FROM permissoes_relatorios");

    // Inserir permissões para cada role e aba
    for (const [role, abas] of Object.entries(PERMISSOES_RELATORIOS)) {
      console.log(`📋 Configurando permissões de relatórios para: ${role}`);

      for (const [aba, permissoes] of Object.entries(abas)) {
        await connection.execute(
          `INSERT INTO permissoes_relatorios (role, aba, visualizar, inserir, excluir)
           VALUES (?, ?, ?, ?, ?)`,
          [role, aba, permissoes.visualizar, permissoes.inserir, permissoes.excluir]
        );
        console.log(`  ✓ ${aba}`);
      }
    }

    console.log("✅ Permissões de relatórios populadas com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao popular permissões de relatórios:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedPermissoesRelatorios();
