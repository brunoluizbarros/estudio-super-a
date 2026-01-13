import XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eventos, turmas, locais, tiposEvento } from '../drizzle/schema.js';
import { eq, and } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada nas variáveis de ambiente');
  process.exit(1);
}

// Conectar ao banco de dados
const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

console.log('🔌 Conectado ao banco de dados');

// Ler arquivo Excel
const buffer = readFileSync('/home/ubuntu/upload/Eventos3.xlsx');
const workbook = XLSX.read(buffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('📊 Total de linhas no arquivo:', data.length);

// Remover linhas vazias e cabeçalho
const rows = data.slice(2).filter(row => row && row[0]); // Pula primeira linha vazia e cabeçalho

console.log('📋 Linhas válidas para processar:', rows.length);

// Mapear tipos de evento do arquivo para o sistema
const tipoEventoMap = {
  'Foto Estudio': 'Foto Estúdio',
  'Foto Oficial': 'Foto Oficial',
  'Foto Descontraida': 'Foto Descontraída',
  'Foto 50%': 'Foto 50%',
  'Foto Samu': 'Foto Samu',
  'Foto Bloco': 'Foto Bloco',
  'Foto Consultorio': 'Foto Consultório'
};

// Buscar todos os tipos de evento do banco
const tiposEventoBD = await db.select().from(tiposEvento);
const tipoEventoIdMap = {};
tiposEventoBD.forEach(tipo => {
  tipoEventoIdMap[tipo.nome] = tipo.id;
});

console.log('🎯 Tipos de evento disponíveis:', Object.keys(tipoEventoIdMap));

// Buscar todos os locais do banco
const locaisBD = await db.select().from(locais);
const localMap = {};
locaisBD.forEach(local => {
  localMap[local.nome.toUpperCase()] = local.id;
});

console.log('📍 Total de locais no banco:', locaisBD.length);

// Buscar todas as turmas do banco
const turmasBD = await db.select().from(turmas);
const turmaCodigoMap = {};
turmasBD.forEach(turma => {
  turmaCodigoMap[turma.codigo] = turma.id;
});

console.log('🎓 Total de turmas no banco:', turmasBD.length);

// Função para converter data serial do Excel para timestamp
function excelDateToTimestamp(serial) {
  // Excel usa 1900-01-01 como base (serial 1)
  // JavaScript usa 1970-01-01 como base
  const excelEpoch = new Date(1899, 11, 30); // 30 de dezembro de 1899
  const days = Math.floor(serial);
  const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
  
  // Ajustar para meia-noite no timezone local (GMT-3)
  date.setHours(0, 0, 0, 0);
  
  return date.getTime();
}

// Processar eventos
let sucessos = 0;
let erros = 0;
const errosDetalhados = [];

for (const row of rows) {
  const [dataSerial, codigoTurma, tipoEventoOriginal, localNome] = row;
  
  try {
    // Validar código da turma
    const turmaId = turmaCodigoMap[codigoTurma];
    if (!turmaId) {
      throw new Error(`Turma com código ${codigoTurma} não encontrada`);
    }
    
    // Converter tipo de evento
    const tipoEventoNome = tipoEventoMap[tipoEventoOriginal] || tipoEventoOriginal;
    const tipoEventoId = tipoEventoIdMap[tipoEventoNome];
    if (!tipoEventoId) {
      throw new Error(`Tipo de evento "${tipoEventoNome}" não encontrado`);
    }
    
    // Buscar local (se informado)
    let localId = null;
    if (localNome && localNome.trim()) {
      const localNomeUpper = localNome.trim().toUpperCase();
      localId = localMap[localNomeUpper];
      
      // Se não encontrar, tentar criar
      if (!localId) {
        const [novoLocal] = await db.insert(locais).values({
          nome: localNome.trim()
        });
        localId = novoLocal.insertId;
        localMap[localNomeUpper] = localId;
        console.log(`  ➕ Novo local criado: ${localNome.trim()}`);
      }
    }
    
    // Converter data
    const dataInicio = excelDateToTimestamp(dataSerial);
    const dataFim = dataInicio; // Evento de um dia só
    
    // Verificar se evento já existe
    const eventoExistente = await db.select()
      .from(eventos)
      .where(
        and(
          eq(eventos.turmaId, turmaId),
          eq(eventos.tipoEventoId, tipoEventoId),
          eq(eventos.dataEventoInicio, dataInicio)
        )
      )
      .limit(1);
    
    if (eventoExistente.length > 0) {
      // Atualizar local se necessário
      if (localId && eventoExistente[0].localId !== localId) {
        await db.update(eventos)
          .set({ localId })
          .where(eq(eventos.id, eventoExistente[0].id));
        console.log(`  ✏️ Evento atualizado: Turma ${codigoTurma} - ${tipoEventoNome} - ${new Date(dataInicio).toLocaleDateString('pt-BR')}`);
      }
    } else {
      // Inserir novo evento
      await db.insert(eventos).values({
        turmaId,
        tipoEventoId,
        localId,
        dataEventoInicio: dataInicio,
        dataEventoFim: dataFim,
        cenarios: null,
        createdAt: Date.now()
      });
      
      console.log(`  ✅ Evento criado: Turma ${codigoTurma} - ${tipoEventoNome} - ${new Date(dataInicio).toLocaleDateString('pt-BR')} ${localNome ? `- ${localNome}` : ''}`);
    }
    
    sucessos++;
  } catch (error) {
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

if (errosDetalhados.length > 0) {
  console.log('\n❌ Detalhes dos erros:');
  errosDetalhados.forEach((item, i) => {
    console.log(`${i + 1}. Linha:`, item.linha);
    console.log(`   Erro: ${item.erro}`);
  });
}

await connection.end();
console.log('\n🔌 Conexão com banco de dados encerrada');
