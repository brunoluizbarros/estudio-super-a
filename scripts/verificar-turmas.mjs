import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.ts';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

// Buscar turmas específicas
const codigosParaBuscar = [389, 443, 468, 475, 497];

console.log('🔍 Buscando turmas específicas da planilha:\n');

const turmas = await db.select().from(schema.turmas);

console.log(`Total de turmas no banco: ${turmas.length}\n`);

console.log('Primeiras 10 turmas:');
turmas.slice(0, 10).forEach(t => {
  console.log(`  ID: ${t.id} | Código: ${t.codigo} | Curso: ${t.curso}`);
});

console.log('\n🎯 Buscando códigos específicos da planilha:');
codigosParaBuscar.forEach(codigo => {
  const turma = turmas.find(t => t.codigo === codigo);
  if (turma) {
    console.log(`  ✅ Turma ${codigo}: ENCONTRADA (ID: ${turma.id})`);
  } else {
    console.log(`  ❌ Turma ${codigo}: NÃO ENCONTRADA`);
  }
});

// Verificar tipo de dado da coluna codigo
console.log('\n📊 Tipo de dado da coluna "codigo":');
const primeiraTurma = turmas[0];
if (primeiraTurma) {
  console.log(`  Código: ${primeiraTurma.codigo} (tipo: ${typeof primeiraTurma.codigo})`);
}

await connection.end();
