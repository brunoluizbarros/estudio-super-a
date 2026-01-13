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

console.log("\n=== ÚLTIMOS 5 EVENTOS ===\n");
result.forEach(evento => {
  console.log(`ID: ${evento.id}`);
  console.log(`Turma: ${evento.turmaId}`);
  console.log(`Tipo: ${evento.tipoEvento}`);
  console.log(`Observação: ${evento.observacao || '(vazio)'}`);
  console.log(`Criado em: ${evento.createdAt}`);
  console.log('---');
});

await connection.end();
