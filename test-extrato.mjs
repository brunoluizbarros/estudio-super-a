import { readFileSync } from 'fs';
import { processarExtratoItauEntrada } from './server/fechamento-extratos-helper.ts';

// Ler arquivo de dezembro
const filePath = './test-extrato.xlsx';
console.log(`Lendo arquivo: ${filePath}`);

const buffer = readFileSync(filePath);
console.log(`Buffer criado com ${buffer.length} bytes`);

// Processar para dezembro/2025
console.log('\n=== PROCESSANDO CARTÕES ===');
const resultadoCartoes = processarExtratoItauEntrada(buffer, 'cartoes', 12, 2025);
console.log('Resultado Cartões:', resultadoCartoes);

console.log('\n=== PROCESSANDO PIX ===');
const resultadoPix = processarExtratoItauEntrada(buffer, 'pix', 12, 2025);
console.log('Resultado PIX:', resultadoPix);

console.log('\n=== PROCESSANDO RENDIMENTO ===');
const resultadoRendimento = processarExtratoItauEntrada(buffer, 'rendimento', 12, 2025);
console.log('Resultado Rendimento:', resultadoRendimento);
