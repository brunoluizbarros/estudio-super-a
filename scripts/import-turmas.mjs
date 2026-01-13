import mysql from "mysql2/promise";
import XLSX from "xlsx";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log("🚀 Iniciando importação de turmas...\n");

  // Connect to database
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("✅ Conectado ao banco de dados\n");

  // Read Excel file
  const workbook = XLSX.readFile(join(__dirname, "../AcompanhamentodasTurmas(2).xlsx"));
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`📊 Total de linhas na planilha: ${data.length}\n`);

  // Maps to track unique values and their IDs
  const instituicoesMap = new Map();
  const cursosMap = new Map();
  const cidadesMap = new Map();

  // Extract unique values
  const instituicoesSet = new Set();
  const cursosSet = new Set();
  const cidadesSet = new Set();

  for (const row of data) {
    // Instituições (pode ter duas)
    if (row["Instituição"]) instituicoesSet.add(row["Instituição"].trim());
    if (row["Instituição.1"]) instituicoesSet.add(row["Instituição.1"].trim());

    // Cursos
    if (row["Curso"]) cursosSet.add(row["Curso"].trim());

    // Cidades - formato "Nome (UF)"
    if (row["Cidade"]) cidadesSet.add(row["Cidade"].trim());
  }

  console.log(`📋 Instituições únicas: ${instituicoesSet.size}`);
  console.log(`📋 Cursos únicos: ${cursosSet.size}`);
  console.log(`📋 Cidades únicas: ${cidadesSet.size}\n`);

  // Insert Instituições
  console.log("📥 Inserindo instituições...");
  for (const nome of instituicoesSet) {
    try {
      await connection.execute(
        `INSERT INTO instituicoes (nome, ativo) VALUES (?, true) ON DUPLICATE KEY UPDATE nome = nome`,
        [nome]
      );
      const [rows] = await connection.execute(`SELECT id FROM instituicoes WHERE nome = ?`, [nome]);
      instituicoesMap.set(nome, rows[0].id);
    } catch (e) {
      console.error(`  Erro ao inserir instituição ${nome}:`, e.message);
    }
  }
  console.log(`  ✅ ${instituicoesMap.size} instituições cadastradas\n`);

  // Insert Cursos
  console.log("📥 Inserindo cursos...");
  for (const nome of cursosSet) {
    try {
      await connection.execute(
        `INSERT INTO cursos (nome, ativo) VALUES (?, true) ON DUPLICATE KEY UPDATE nome = nome`,
        [nome]
      );
      const [rows] = await connection.execute(`SELECT id FROM cursos WHERE nome = ?`, [nome]);
      cursosMap.set(nome, rows[0].id);
    } catch (e) {
      console.error(`  Erro ao inserir curso ${nome}:`, e.message);
    }
  }
  console.log(`  ✅ ${cursosMap.size} cursos cadastrados\n`);

  // Insert Cidades
  console.log("📥 Inserindo cidades...");
  for (const cidadeCompleta of cidadesSet) {
    try {
      // Parse "Nome (UF)" or "Nome / Complemento (UF)"
      const match = cidadeCompleta.match(/^(.+?)\s*\((\w{2})\)$/);
      let nome, estado;
      if (match) {
        nome = match[1].trim();
        estado = match[2].toUpperCase();
      } else {
        nome = cidadeCompleta;
        estado = "XX"; // Unknown
      }

      await connection.execute(
        `INSERT INTO cidades (nome, estado, ativo) VALUES (?, ?, true) ON DUPLICATE KEY UPDATE nome = nome`,
        [nome, estado]
      );
      const [rows] = await connection.execute(`SELECT id FROM cidades WHERE nome = ? AND estado = ?`, [nome, estado]);
      cidadesMap.set(cidadeCompleta, { id: rows[0].id, nome, estado });
    } catch (e) {
      console.error(`  Erro ao inserir cidade ${cidadeCompleta}:`, e.message);
    }
  }
  console.log(`  ✅ ${cidadesMap.size} cidades cadastradas\n`);

  // Insert Turmas and Events
  console.log("📥 Inserindo turmas e eventos...");
  let turmasInseridas = 0;
  let eventosInseridos = 0;

  for (const row of data) {
    try {
      // Build codigo (concatenate Cód and Cód.1 if both exist)
      let codigo = "";
      if (row["Cód"]) codigo = String(Math.floor(row["Cód"]));
      if (row["Cód.1"]) codigo += " " + String(Math.floor(row["Cód.1"]));
      codigo = codigo.trim();

      if (!codigo) {
        console.log(`  ⚠️ Linha sem código, pulando...`);
        continue;
      }

      // Build arrays for multiple values
      const instituicoes = [];
      if (row["Instituição"]) instituicoes.push(row["Instituição"].trim());
      if (row["Instituição.1"]) instituicoes.push(row["Instituição.1"].trim());

      const cursos = [];
      if (row["Curso"]) cursos.push(row["Curso"].trim());

      const anos = [];
      if (row["Ano"]) anos.push(String(Math.floor(row["Ano"])));
      if (row["Ano.1"] && row["Ano.1"] !== row["Ano"]) anos.push(String(Math.floor(row["Ano.1"])));

      const periodos = [];
      if (row["Período"]) periodos.push(String(Math.floor(row["Período"])));
      if (row["Período.1"] && row["Período.1"] !== row["Período"]) periodos.push(String(Math.floor(row["Período.1"])));

      const numeroTurma = row["Turma"] ? String(Math.floor(row["Turma"])) : "";

      // Parse cidade
      let cidade = "";
      let estado = "";
      if (row["Cidade"]) {
        const cidadeInfo = cidadesMap.get(row["Cidade"].trim());
        if (cidadeInfo) {
          cidade = cidadeInfo.nome;
          estado = cidadeInfo.estado;
        }
      }

      // Insert turma - include legacy columns for compatibility
      const firstCurso = cursos[0] || '';
      const firstInstituicao = instituicoes[0] || '';
      const firstAno = anos[0] ? parseInt(anos[0]) : 2025;
      const firstPeriodo = periodos[0] || '1';
      
      await connection.execute(
        `INSERT INTO turmas (codigo, curso, instituicao, numeroTurma, ano, periodo, cidade, estado, cursos, instituicoes, anos, periodos) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE cursos = VALUES(cursos), instituicoes = VALUES(instituicoes), anos = VALUES(anos), periodos = VALUES(periodos)`,
        [
          codigo,
          firstCurso,
          firstInstituicao,
          numeroTurma,
          firstAno,
          firstPeriodo,
          cidade,
          estado,
          JSON.stringify(cursos),
          JSON.stringify(instituicoes),
          JSON.stringify(anos),
          JSON.stringify(periodos)
        ]
      );

      // Get turma ID
      const [turmaRows] = await connection.execute(`SELECT id FROM turmas WHERE codigo = ?`, [codigo]);
      const turmaId = turmaRows[0]?.id;

      if (turmaId) {
        turmasInseridas++;

        // Create events based on columns
        const eventosConfig = [
          { coluna: "Foto Estúdio", tipo: "foto_estudio" },
          { coluna: "Foto Descontraída", tipo: "foto_descontrada" },
          { coluna: "Foto Oficial", tipo: "foto_oficial" },
          { coluna: "Foto 50%", tipo: "foto_50" },
          { coluna: "Foto Bloco", tipo: "foto_bloco" },
          { coluna: "Foto Samu", tipo: "foto_samu" },
        ];

        for (const evento of eventosConfig) {
          const valor = row[evento.coluna];
          if (valor !== undefined && valor !== null && valor !== "") {
            try {
              await connection.execute(
                `INSERT INTO eventos (turmaId, tipoEvento, status) VALUES (?, ?, 'agendado')`,
                [turmaId, evento.tipo]
              );
              eventosInseridos++;
            } catch (e) {
              if (!e.message.includes('Duplicate')) {
                console.log(`    Erro evento ${evento.tipo}:`, e.message);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(`  Erro ao processar linha:`, e.message);
    }
  }

  console.log(`  ✅ ${turmasInseridas} turmas cadastradas`);
  console.log(`  ✅ ${eventosInseridos} eventos criados\n`);

  await connection.end();
  console.log("🎉 Importação concluída com sucesso!");
  process.exit(0);
}

main().catch((e) => {
  console.error("Erro fatal:", e);
  process.exit(1);
});
