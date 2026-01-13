import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Verificar estrutura da tabela
const [rows] = await connection.execute('DESCRIBE permissoes');
console.log('Estrutura da tabela permissoes:');
console.table(rows);

// Verificar se há algum registro
const [count] = await connection.execute('SELECT COUNT(*) as total FROM permissoes');
console.log('\nTotal de registros:', count[0].total);

await connection.end();
