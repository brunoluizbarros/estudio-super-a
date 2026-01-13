import XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';

const buffer = readFileSync('/home/ubuntu/upload/Eventos3.xlsx');
const workbook = XLSX.read(buffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Converter para CSV
const csv = XLSX.utils.sheet_to_csv(sheet);
writeFileSync('/home/ubuntu/eventos3.csv', csv);
console.log('✅ Arquivo convertido para /home/ubuntu/eventos3.csv');

// Mostrar primeiras 10 linhas
const lines = csv.split('\n').slice(0, 15);
console.log('\n📄 Primeiras 15 linhas:');
lines.forEach((line, i) => console.log(`${i}: ${line}`));
