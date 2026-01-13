import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const buffer = readFileSync('/home/ubuntu/upload/Eventos3.xlsx');
const workbook = XLSX.read(buffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet);

console.log('📊 Total de linhas:', data.length);
console.log('\n📋 Primeiras 3 linhas:');
console.log(JSON.stringify(data.slice(0, 3), null, 2));

console.log('\n🔑 Colunas disponíveis:');
if (data.length > 0) {
  console.log(Object.keys(data[0]));
}

// Verificar datas
console.log('\n📅 Análise de datas:');
const datas = data.map(row => {
  const dataInicio = row['Data Inicio'] || row['Data Início'] || row['DATA INICIO'];
  const dataFim = row['Data Fim'] || row['DATA FIM'];
  return { dataInicio, dataFim };
}).filter(d => d.dataInicio);

console.log('Primeira data:', datas[0]);
console.log('Última data:', datas[datas.length - 1]);
console.log('Total de eventos com data:', datas.length);
