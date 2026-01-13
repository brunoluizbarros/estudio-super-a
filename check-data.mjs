import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, like } from 'drizzle-orm';
import * as schema from './drizzle/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection, { schema, mode: 'default' });
  
  // Buscar o formando Aires
  const formandos = await db.select().from(schema.formandos).where(like(schema.formandos.nome, '%Aires%')).limit(1);
  
  if (formandos.length > 0) {
    const formando = formandos[0];
    console.log('Formando encontrado:', formando.nome, 'ID:', formando.id);
    
    // Buscar a execução do formando
    const execucoes = await db.select().from(schema.execucaoFormando).where(eq(schema.execucaoFormando.formandoId, formando.id));
    
    console.log('Execuções encontradas:', execucoes.length);
    for (const exec of execucoes) {
      console.log('Execução ID:', exec.id);
      console.log('  eventoId:', exec.eventoId);
      console.log('  dataExecucao:', exec.dataExecucao);
      console.log('  dataExecucao type:', typeof exec.dataExecucao);
      console.log('  arquivoEntregue:', exec.arquivoEntregue);
    }
  } else {
    console.log('Formando não encontrado');
  }
  
  await connection.end();
}

main().catch(console.error);
