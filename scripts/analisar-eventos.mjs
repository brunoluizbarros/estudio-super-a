import XLSX from 'xlsx';

const filePath = '/home/ubuntu/upload/EVENTOS.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Ler dados raw
  const dataRaw = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Linha 0 está vazia, linha 1 tem o cabeçalho, dados começam na linha 2
  const headers = dataRaw[1]; // ["DATA", "CÓDIGO TURMA", "TIPO DE EVENTO"]
  const rows = dataRaw.slice(2); // Pular linhas 0 e 1
  
  // Converter para objetos
  const data = rows.map(row => ({
    data: row[0],
    codigoTurma: row[1],
    tipoEvento: row[2]
  })).filter(row => row.codigoTurma); // Remover linhas vazias
  
  console.log('📊 ANÁLISE DA PLANILHA EVENTOS.xlsx\n');
  console.log(`Total de linhas de dados: ${data.length}`);
  console.log(`\nCabeçalhos: ${JSON.stringify(headers)}`);
  
  console.log('\n🔍 Primeiras 10 linhas:');
  data.slice(0, 10).forEach((row, idx) => {
    // Converter data serial do Excel para data legível
    const dataExcel = row.data;
    const date = XLSX.SSF.parse_date_code(dataExcel);
    const dataFormatada = `${String(date.d).padStart(2, '0')}/${String(date.m).padStart(2, '0')}/${date.y}`;
    console.log(`${idx + 1}. Data: ${dataFormatada} | Turma: ${row.codigoTurma} | Tipo: ${row.tipoEvento}`);
  });
  
  // Tipos de eventos únicos
  const tiposEvento = [...new Set(data.map(row => row.tipoEvento))].filter(Boolean).sort();
  console.log('\n🎯 Tipos de Eventos encontrados:');
  tiposEvento.forEach(tipo => console.log(`  - ${tipo}`));
  
  // Turmas únicas
  const turmas = [...new Set(data.map(row => row.codigoTurma))].filter(Boolean).sort((a, b) => a - b);
  console.log(`\n🎓 Total de turmas únicas: ${turmas.length}`);
  console.log('Turmas:', turmas.join(', '));
  
  // Agrupar por turma + tipo de evento
  const grupos = {};
  data.forEach(row => {
    const key = `${row.codigoTurma}-${row.tipoEvento}`;
    if (!grupos[key]) {
      grupos[key] = {
        turma: row.codigoTurma,
        tipo: row.tipoEvento,
        datas: []
      };
    }
    grupos[key].datas.push(row.data);
  });
  
  console.log(`\n📅 Total de eventos únicos (turma + tipo): ${Object.keys(grupos).length}`);
  console.log('\n🔍 Primeiros 5 eventos agrupados:');
  Object.values(grupos).slice(0, 5).forEach(grupo => {
    const datas = grupo.datas.sort((a, b) => a - b);
    const dataInicio = XLSX.SSF.parse_date_code(datas[0]);
    const dataFim = XLSX.SSF.parse_date_code(datas[datas.length - 1]);
    console.log(`  Turma ${grupo.turma} - ${grupo.tipo}: ${datas.length} dia(s) | ${dataInicio.d}/${dataInicio.m}/${dataInicio.y} a ${dataFim.d}/${dataFim.m}/${dataFim.y}`);
  });

} catch (error) {
  console.error('❌ Erro ao analisar planilha:', error.message);
  console.error(error);
}
