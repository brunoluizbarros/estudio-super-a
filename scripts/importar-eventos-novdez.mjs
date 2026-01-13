import XLSX from 'xlsx';
import { drizzle } from 'drizzle-orm/mysql2';
import { turmas, eventos } from '../drizzle/schema.ts';
import { eq } from 'drizzle-orm';

// Mapeamento de tipos de eventos do Excel para valores ENUM do schema
const TIPO_EVENTO_MAP = {
  'Foto Estudio': 'foto_estudio',
  'Foto 50%': 'foto_50',
  'Foto Descontraida': 'foto_descontrada',
  'Foto Oficial': 'foto_oficial',
  'Foto Samu': 'foto_samu',
  'Foto da Estrela': 'foto_estrela',
  'Foto Internato': 'foto_internato',
  'Family Day': 'family_day',
  'Foto de Bloco': 'foto_bloco'
};

// Função para converter data serial do Excel para timestamp
function excelDateToTimestamp(serial) {
  const excelEpoch = new Date(1899, 11, 30);
  const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  return localDate.getTime();
}

async function importarEventosNovDez() {
  console.log('=== IMPORTAÇÃO DE EVENTOS NOV/DEZ ===\n');
  
  // Conectar ao banco de dados
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada');
  }
  const db = drizzle(process.env.DATABASE_URL);
  
  // 1. Ler arquivo Excel
  console.log('1. Lendo arquivo Eventos2.xlsx...');
  const workbook = XLSX.readFile('/home/ubuntu/upload/Eventos2.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  const eventosExcel = data.slice(1)
    .filter(row => row[0] && row[0] !== 'DATA')
    .map(row => ({
      data: row[0],
      codigoTurma: String(row[1]).replace(/[\r\n]+/g, ' ').trim(),
      tipoEvento: row[2]
    }));
  
  console.log(`   ✓ ${eventosExcel.length} eventos encontrados\n`);
  
  // 2. Buscar todas as turmas do banco
  console.log('2. Buscando turmas no banco de dados...');
  const turmasBanco = await db.select().from(turmas);
  const turmasPorCodigo = new Map(turmasBanco.map(t => [String(t.codigo), t]));
  console.log(`   ✓ ${turmasBanco.length} turmas encontradas\n`);
  
  // 3. Validar e preparar eventos para importação
  console.log('3. Validando e preparando eventos...');
  const eventosParaImportar = [];
  const turmasNaoEncontradas = new Set();
  const tiposNaoMapeados = new Set();
  
  for (const eventoExcel of eventosExcel) {
    const turma = turmasPorCodigo.get(String(eventoExcel.codigoTurma));
    if (!turma) {
      turmasNaoEncontradas.add(eventoExcel.codigoTurma);
      continue;
    }
    
    const tipoEvento = TIPO_EVENTO_MAP[eventoExcel.tipoEvento];
    if (!tipoEvento) {
      tiposNaoMapeados.add(eventoExcel.tipoEvento);
      continue;
    }
    
    const dataEventoTimestamp = excelDateToTimestamp(eventoExcel.data);
    const dataEventoDate = new Date(dataEventoTimestamp);
    
    eventosParaImportar.push({
      turmaId: turma.id,
      tipoEvento: tipoEvento,
      dataEvento: dataEventoDate,
      dataEventoFim: dataEventoDate,
      local: null,
      cenarios: null,
      fotografos: null,
      cerimoniais: null,
      coordenadores: null,
      producao: null,
      maquiadoras: null,
      observacao: null,
      horariosInicio: null
    });
  }
  
  console.log(`   ✓ ${eventosParaImportar.length} eventos válidos`);
  
  if (turmasNaoEncontradas.size > 0) {
    console.log(`   ⚠ ${turmasNaoEncontradas.size} turmas não encontradas:`);
    Array.from(turmasNaoEncontradas).slice(0, 10).forEach(codigo => {
      console.log(`      ${codigo}`);
    });
  }
  
  if (tiposNaoMapeados.size > 0) {
    console.log(`   ⚠ ${tiposNaoMapeados.size} tipos não mapeados:`);
    Array.from(tiposNaoMapeados).forEach(tipo => {
      console.log(`      ${tipo}`);
    });
  }
  
  console.log('');
  
  // 4. Importar eventos (SEM DELETAR OS EXISTENTES)
  console.log('4. Adicionando eventos no banco de dados...');
  console.log('   ⚠ MODO SEGURO: Apenas adicionando, sem deletar eventos existentes\n');
  
  const batchSize = 100;
  let importados = 0;
  
  for (let i = 0; i < eventosParaImportar.length; i += batchSize) {
    const batch = eventosParaImportar.slice(i, i + batchSize);
    await db.insert(eventos).values(batch);
    importados += batch.length;
    console.log(`   ✓ ${importados}/${eventosParaImportar.length} eventos adicionados`);
  }
  
  console.log('\n=== IMPORTAÇÃO CONCLUÍDA ===');
  console.log(`Total adicionado: ${importados} eventos`);
  console.log(`Turmas não encontradas: ${turmasNaoEncontradas.size}`);
  console.log(`Tipos não mapeados: ${tiposNaoMapeados.size}`);
  
  // Estatísticas
  console.log('\n=== ESTATÍSTICAS ===');
  const tiposCounts = {};
  eventosParaImportar.forEach(e => {
    tiposCounts[e.tipoEvento] = (tiposCounts[e.tipoEvento] || 0) + 1;
  });
  
  console.log('Eventos adicionados por tipo:');
  Object.entries(tiposCounts).sort((a, b) => b[1] - a[1]).forEach(([tipo, count]) => {
    console.log(`  ${tipo}: ${count}`);
  });
  
  console.log('\n✓ Script finalizado com sucesso');
}

importarEventosNovDez().catch(error => {
  console.error('❌ Erro durante importação:', error);
  process.exit(1);
});
