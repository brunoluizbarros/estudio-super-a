import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

// Verificar se tabela tipos_evento existe
try {
  const [rows] = await connection.query('SELECT * FROM tipos_evento LIMIT 10');
  console.log('✅ Tabela tipos_evento existe');
  console.log('📋 Registros:', rows);
} catch (error) {
  console.log('❌ Tabela tipos_evento não existe:', error.message);
}

// Verificar estrutura da tabela eventos
try {
  const [columns] = await connection.query('DESCRIBE eventos');
  console.log('\n📊 Estrutura da tabela eventos:');
  console.log(columns);
} catch (error) {
  console.log('❌ Erro ao verificar tabela eventos:', error.message);
}

await connection.end();
