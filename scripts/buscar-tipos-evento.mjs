import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.ts';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

const tiposEvento = await db.select().from(schema.tiposEvento);

console.log('🎯 Tipos de Evento cadastrados no sistema:\n');
tiposEvento.forEach(tipo => {
  console.log(`ID: ${tipo.id} | Nome: ${tipo.nome}`);
});

console.log(`\nTotal: ${tiposEvento.length} tipos cadastrados`);

await connection.end();
