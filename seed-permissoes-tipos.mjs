import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Definir permissões padrão para cada tipo de usuário
const permissoesPorTipo = {
  "Financeiro": {
    turmas: { visualizar: true, inserir: false, excluir: false },
    eventos: { visualizar: true, inserir: false, excluir: false },
    abordagem: { visualizar: false, inserir: false, excluir: false },
    execucao: { visualizar: true, inserir: false, excluir: false },
    vendas: { visualizar: true, inserir: true, excluir: true },
    servicos: { visualizar: true, inserir: true, excluir: true },
    financeiro: { visualizar: true, inserir: true, excluir: true },
    despesas: { visualizar: true, inserir: true, excluir: true },
    relatorios: { visualizar: true, inserir: false, excluir: false },
    reunioes: { visualizar: false, inserir: false, excluir: false },
    briefing: { visualizar: false, inserir: false, excluir: false },
    becas: { visualizar: false, inserir: false, excluir: false },
    configuracoes: { visualizar: false, inserir: false, excluir: false },
  },
  "Beca": {
    turmas: { visualizar: true, inserir: false, excluir: false },
    eventos: { visualizar: true, inserir: false, excluir: false },
    abordagem: { visualizar: false, inserir: false, excluir: false },
    execucao: { visualizar: false, inserir: false, excluir: false },
    vendas: { visualizar: false, inserir: false, excluir: false },
    servicos: { visualizar: false, inserir: false, excluir: false },
    financeiro: { visualizar: false, inserir: false, excluir: false },
    despesas: { visualizar: false, inserir: false, excluir: false },
    relatorios: { visualizar: false, inserir: false, excluir: false },
    reunioes: { visualizar: false, inserir: false, excluir: false },
    briefing: { visualizar: false, inserir: false, excluir: false },
    becas: { visualizar: true, inserir: true, excluir: true },
    configuracoes: { visualizar: false, inserir: false, excluir: false },
  },
};

async function seedPermissoes() {
  console.log("🔧 Iniciando seed de permissões...");

  // Buscar IDs dos tipos de usuário
  const [tiposUsuario] = await connection.query(
    "SELECT id, nome FROM tipos_usuario WHERE nome IN ('Financeiro', 'Beca')"
  );

  for (const tipo of tiposUsuario) {
    console.log(`\n📋 Processando tipo: ${tipo.nome} (ID: ${tipo.id})`);
    
    const permissoes = permissoesPorTipo[tipo.nome];
    
    if (!permissoes) {
      console.log(`⚠️  Nenhuma permissão definida para ${tipo.nome}`);
      continue;
    }

    // Atualizar ou inserir permissões
    for (const [secao, perms] of Object.entries(permissoes)) {
      // Verificar se já existe
      const [existing] = await connection.query(
        "SELECT id FROM permissoes WHERE role = ? AND secao = ?",
        [tipo.nome, secao]
      );

      if (existing.length > 0) {
        // Atualizar permissão existente
        await connection.query(
          `UPDATE permissoes 
           SET visualizar = ?, inserir = ?, excluir = ?, tipoUsuarioId = ?, updatedAt = NOW()
           WHERE role = ? AND secao = ?`,
          [perms.visualizar, perms.inserir, perms.excluir, tipo.id, tipo.nome, secao]
        );
        console.log(`  🔄 ${secao}: atualizado`);
      } else {
        // Inserir nova permissão
        await connection.query(
          `INSERT INTO permissoes (role, secao, visualizar, inserir, excluir, tipoUsuarioId, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [tipo.nome, secao, perms.visualizar, perms.inserir, perms.excluir, tipo.id]
        );
        console.log(`  ✅ ${secao}: criado`);
      }
    }
  }

  console.log("\n✨ Seed de permissões concluído!");
  await connection.end();
}

seedPermissoes().catch((error) => {
  console.error("❌ Erro ao executar seed:", error);
  process.exit(1);
});
