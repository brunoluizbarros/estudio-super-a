import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eventos } from './drizzle/schema.ts';
import { desc } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const result = await db.select({
  id: eventos.id,
  turmaId: eventos.turmaId,
  tipoEvento: eventos.tipoEvento,
  observacao: eventos.observacao,
  createdAt: eventos.createdAt
}).from(eventos).orderBy(desc(eventos.createdAt)).limit(5);

console.log(JSON.stringify(result, null, 2));
await connection.end();
