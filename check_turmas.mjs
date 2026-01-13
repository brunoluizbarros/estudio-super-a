import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

const turmas = await db.select().from(schema.turmas).limit(10);

console.log('Total de turmas encontradas:', turmas.length);
console.log('\nPrimeiras 10 turmas:');
turmas.forEach(t => {
  console.log(`ID: ${t.id}, Código: ${t.codigo}, Curso: ${t.cursos}, Instituição: ${t.instituicoes}`);
});

await connection.end();
