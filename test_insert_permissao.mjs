import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { permissoes } from './drizzle/schema.ts';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { logger: true }); // Ativar logger para ver SQL

console.log('Tentando inserir permissão...');

const insertData = {
  role: 'teste',
  secao: 'home',
  visualizar: true,
  inserir: false,
  excluir: false,
  tipoUsuarioId: 1,
};

console.log('Dados a inserir:', insertData);

try {
  const [result] = await db.insert(permissoes).values(insertData);
  console.log('Sucesso! ID inserido:', result.insertId);
} catch (error) {
  console.error('Erro ao inserir:', error.message);
  console.error('SQL:', error.sql);
}

await connection.end();
