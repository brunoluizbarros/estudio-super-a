import XLSX from 'xlsx';
import { drizzle } from 'drizzle-orm/mysql2';
import { turmas, eventos } from '../drizzle/schema.ts';
import { eq } from 'drizzle-orm';

// Mapeamento de tipos de eventos do Excel para valores ENUM do schema
const TIPO_EVENTO_MAP = {
  'Foto Estudio': 'foto_estudio',
  'Foto 50%': 'foto_50',
  'Foto Descontraida': 'foto_descontrada', // Note: typo no schema (descontrada)
  'Foto Oficial': 'foto_oficial',
  'Foto Samu': 'foto_samu',
  'Foto da Estrela': 'foto_estrela',
  'Foto Internato': 'foto_internato',
  'Family Day': 'family_day'
};

// Função para converter data serial do Excel para timestamp
function excelDateToTimestamp(serial) {
  // Excel conta dias desde 1/1/1900
  // JavaScript conta milissegundos desde 1/1/1970
  const excelEpoch = new Date(1899, 11, 30); // 30/12/1899
  const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
  
  // Ajustar para meia-noite no horário local (Recife UTC-3)
  // Definir hora para 00:00:00 no timezone local
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  
  return localDate.getTime();
}

async function importarEventos() {
  console.log('=== IMPORTAÇÃO DE EVENTOS ===\n');
  
  // Conectar ao banco de dados
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada');
  }
  const db = drizzle(process.env.DATABASE_URL);
  
  // 1. Ler arquivo Excel
  console.log('1. Lendo arquivo EVENTOS.xlsx...');
  const workbook = XLSX.readFile('/home/ubuntu/upload/EVENTOS.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Dados começam da linha 2 (primeira linha é cabeçalho)
  const eventosExcel = data.slice(1)
    .filter(row => row[0] && row[0] !== 'DATA') // Filtrar linha de cabeçalho e vazias
    .map(row => ({
      data: row[0],
      // Normalizar código: remover quebras de linha e substituir por espaço
      codigoTurma: String(row[1]).replace(/[\r\n]+/g, ' ').trim(),
      tipoEvento: row[2]
    }));
  
  console.log(`   ✓ ${eventosExcel.length} eventos encontrados\n`);
  
  // 2. Buscar todas as turmas do banco
  console.log('2. Buscando turmas no banco de dados...');
  const turmasBanco = await db.select().from(turmas);
  // IMPORTANTE: codigo no banco é string, converter para comparação
  const turmasPorCodigo = new Map(turmasBanco.map(t => [String(t.codigo), t]));
  console.log(`   ✓ ${turmasBanco.length} turmas encontradas\n`);
  
  // 3. Validar e preparar eventos para importação
  console.log('3. Validando e preparando eventos...');
  const eventosParaImportar = [];
  const erros = [];
  const turmasNaoEncontradas = new Set();
  const tiposNaoMapeados = new Set();
  
  for (const eventoExcel of eventosExcel) {
    // Validar turma existe (converter código para string)
    const turma = turmasPorCodigo.get(String(eventoExcel.codigoTurma));
    if (!turma) {
      turmasNaoEncontradas.add(eventoExcel.codigoTurma);
      continue;
    }
    
    // Validar tipo de evento
    const tipoEvento = TIPO_EVENTO_MAP[eventoExcel.tipoEvento];
    if (!tipoEvento) {
      tiposNaoMapeados.add(eventoExcel.tipoEvento);
      continue;
    }
    
    // Converter data (timestamp para Date object)
    const dataEventoTimestamp = excelDateToTimestamp(eventoExcel.data);
    const dataEventoDate = new Date(dataEventoTimestamp);
    
    eventosParaImportar.push({
      turmaId: turma.id,
      tipoEvento: tipoEvento, // Agora é um ID numérico
      dataEvento: dataEventoDate,
      dataEventoFim: dataEventoDate, // Mesmo dia por padrão
      local: null,
      cenarios: null,
      fotografos: null,
      maquiadoras: null,
      cerimoniais: null,
      coordenadores: null,
      producao: null,
      horariosInicio: null,
      observacao: null
    });
  }
  
  console.log(`   ✓ ${eventosParaImportar.length} eventos válidos`);
  
  if (turmasNaoEncontradas.size > 0) {
    console.log(`   ⚠ ${turmasNaoEncontradas.size} turmas não encontradas:`);
    const turmasArray = Array.from(turmasNaoEncontradas).sort((a, b) => a - b);
    console.log(`      ${turmasArray.join(', ')}`);
  }
  
  if (tiposNaoMapeados.size > 0) {
    console.log(`   ⚠ ${tiposNaoMapeados.size} tipos de evento não mapeados:`);
    Array.from(tiposNaoMapeados).forEach(tipo => console.log(`      - ${tipo}`));
  }
  console.log('');
  
  // 4. Importar eventos em lotes
  console.log('4. Importando eventos no banco de dados...');
  const BATCH_SIZE = 100;
  let importados = 0;
  
  for (let i = 0; i < eventosParaImportar.length; i += BATCH_SIZE) {
    const batch = eventosParaImportar.slice(i, i + BATCH_SIZE);
    await db.insert(eventos).values(batch);
    importados += batch.length;
    console.log(`   ✓ ${importados}/${eventosParaImportar.length} eventos importados`);
  }
  
  console.log('\n=== IMPORTAÇÃO CONCLUÍDA ===');
  console.log(`Total importado: ${importados} eventos`);
  console.log(`Turmas não encontradas: ${turmasNaoEncontradas.size}`);
  console.log(`Tipos não mapeados: ${tiposNaoMapeados.size}`);
  
  // 5. Estatísticas
  console.log('\n=== ESTATÍSTICAS ===');
  const eventosPorTipo = {};
  eventosParaImportar.forEach(e => {
    eventosPorTipo[e.tipoEvento] = (eventosPorTipo[e.tipoEvento] || 0) + 1;
  });
  console.log('Eventos por tipo:');
  Object.entries(eventosPorTipo)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tipo, count]) => {
      console.log(`  ${tipo}: ${count}`);
    });
}

// Executar importação
importarEventos()
  .then(() => {
    console.log('\n✓ Script finalizado com sucesso');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Erro na importação:', error);
    process.exit(1);
  });
