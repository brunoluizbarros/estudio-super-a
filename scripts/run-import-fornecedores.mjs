#!/usr/bin/env node
/**
 * Script para importar fornecedores do arquivo JSON para o banco de dados.
 * Usa a conexão do projeto.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ler arquivo SQL
const sqlContent = fs.readFileSync('/home/ubuntu/fornecedores_insert.sql', 'utf-8');

// Separar em statements individuais
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s.startsWith('INSERT'));

console.log(`Total de statements: ${statements.length}`);

// Gerar arquivo com todos os statements para execução em lote
const batchStatements = statements.map(s => s + ';').join('\n');
fs.writeFileSync('/home/ubuntu/fornecedores_batch.sql', batchStatements);
console.log('Arquivo de lote gerado: /home/ubuntu/fornecedores_batch.sql');
