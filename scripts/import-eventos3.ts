import XLSX from 'xlsx';
import { readFileSync } from 'fs';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada nas variáveis de ambiente');
  process.exit(1);
}

async function main() {
  // Conectar ao banco de dados
  const connection = await mysql.createConnection(DATABASE_URL);

  console.log('🔌 Conectado ao banco de dados');

  // Ler arquivo Excel
  const buffer = readFileSync('/home/ubuntu/upload/Eventos3.xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  console.log('📊 Total de linhas no arquivo:', data.length);

  // Remover linhas vazias e cabeçalho
  const rows = data.slice(2).filter(row => row && row[0]); // Pula primeira linha vazia e cabeçalho

  console.log('📋 Linhas válidas para processar:', rows.length);

  // Mapear tipos de evento do arquivo para o enum do banco
  const tipoEventoMap: Record<string, string> = {
    'Foto Estudio': 'foto_estudio',
    'Foto Oficial': 'foto_oficial',
    'Foto Descontraida': 'foto_descontrada',
    'Foto 50%': 'foto_50',
    'Foto Samu': 'foto_samu',
    'Foto Bloco': 'foto_bloco',
    'Foto Consultorio': 'foto_consultorio'
  };

  // Buscar todos os locais do banco
  const [locaisBD] = await connection.query('SELECT id, nome FROM locais');
  const localMap: Record<string, number> = {};
  (locaisBD as any[]).forEach(local => {
    localMap[local.nome.toUpperCase()] = local.id;
  });

  console.log('📍 Total de locais no banco:', locaisBD.length);

  // Buscar todas as turmas do banco
  const [turmasBD] = await connection.query('SELECT id, codigo FROM turmas');
  const turmaCodigoMap: Record<number, number> = {};
  (turmasBD as any[]).forEach(turma => {
    turmaCodigoMap[turma.codigo] = turma.id;
  });

  console.log('🎓 Total de turmas no banco:', turmasBD.length);

  // Função para converter data serial do Excel para timestamp
  function excelDateToTimestamp(serial: number): Date {
    // Excel usa 1900-01-01 como base (serial 1)
    // JavaScript usa 1970-01-01 como base
    const excelEpoch = new Date(1899, 11, 30); // 30 de dezembro de 1899
    const days = Math.floor(serial);
    const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    
    // Ajustar para meia-noite no timezone local (GMT-3)
    date.setHours(0, 0, 0, 0);
    
    return date;
  }

  // Processar eventos
  let sucessos = 0;
  let erros = 0;
  const errosDetalhados: Array<{ linha: any[]; erro: string }> = [];

  for (const row of rows) {
    const [dataSerial, codigoTurma, tipoEventoOriginal, localNome] = row;
    
    try {
      // Validar código da turma
      const turmaId = turmaCodigoMap[codigoTurma];
      if (!turmaId) {
        throw new Error(`Turma com código ${codigoTurma} não encontrada`);
      }
      
      // Converter tipo de evento
      const tipoEventoEnum = tipoEventoMap[tipoEventoOriginal];
      if (!tipoEventoEnum) {
        throw new Error(`Tipo de evento "${tipoEventoOriginal}" não mapeado`);
      }
      
      // Buscar local (se informado)
      let localId: number | null = null;
      if (localNome && localNome.trim && localNome.trim()) {
        const localNomeUpper = localNome.trim().toUpperCase();
        localId = (localMap[localNomeUpper] as number) || null;
        
        // Se não encontrar, tentar criar
        if (!localId) {
          const [result] = await connection.query(
            'INSERT INTO locais (nome, ativo, createdAt, updatedAt) VALUES (?, true, NOW(), NOW())',
            [localNome.trim()]
          );
          localId = (result as any).insertId;
          localMap[localNomeUpper] = localId;
          console.log(`  ➕ Novo local criado: ${localNome.trim()}`);
        }
      }
      
      // Converter data
      const dataInicio = excelDateToTimestamp(dataSerial);
      const dataFim = new Date(dataInicio);
      
      // Verificar se evento já existe
      const [eventoExistente] = await connection.query(
        'SELECT id, local FROM eventos WHERE turmaId = ? AND tipoEvento = ? AND DATE(dataEvento) = DATE(?)',
        [turmaId, tipoEventoEnum, dataInicio]
      );
      
      if ((eventoExistente as any[]).length > 0) {
        // Atualizar local se necessário
        const eventoAtual = (eventoExistente as any[])[0];
        if (localId && eventoAtual.local !== localNome) {
          await connection.query(
            'UPDATE eventos SET local = ? WHERE id = ?',
            [localNome || null, eventoAtual.id]
          );
          console.log(`  ✏️ Evento atualizado: Turma ${codigoTurma} - ${tipoEventoOriginal} - ${dataInicio.toLocaleDateString('pt-BR')}`);
        }
      } else {
        // Inserir novo evento
        await connection.query(
          'INSERT INTO eventos (turmaId, tipoEvento, dataEvento, dataEventoFim, local, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
          [turmaId, tipoEventoEnum, dataInicio, dataFim, localNome || null, 'agendado']
        );
        
        console.log(`  ✅ Evento criado: Turma ${codigoTurma} - ${tipoEventoOriginal} - ${dataInicio.toLocaleDateString('pt-BR')} ${localNome ? `- ${localNome}` : ''}`);
      }
      
      sucessos++;
    } catch (error: any) {
      erros++;
      errosDetalhados.push({
        linha: row,
        erro: error.message
      });
      console.error(`  ❌ Erro ao processar linha:`, row, error.message);
    }
  }

  console.log('\n📊 Resumo da importação:');
  console.log(`✅ Sucessos: ${sucessos}`);
  console.log(`❌ Erros: ${erros}`);

  if (errosDetalhados.length > 0 && errosDetalhados.length <= 10) {
    console.log('\n❌ Detalhes dos erros:');
    errosDetalhados.forEach((item, i) => {
      console.log(`${i + 1}. Linha:`, item.linha);
      console.log(`   Erro: ${item.erro}`);
    });
  } else if (errosDetalhados.length > 10) {
    console.log(`\n❌ ${errosDetalhados.length} erros encontrados (mostrando primeiros 10):`);
    errosDetalhados.slice(0, 10).forEach((item, i) => {
      console.log(`${i + 1}. Linha:`, item.linha);
      console.log(`   Erro: ${item.erro}`);
    });
  }

  await connection.end();
  console.log('\n🔌 Conexão com banco de dados encerrada');
}

main().catch(console.error);
