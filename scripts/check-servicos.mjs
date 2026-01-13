import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await connection.execute('SELECT id, eventoId, formandoId, tipoServico, quantidade, valorUnitario FROM servicos_execucao ORDER BY id DESC LIMIT 20');
console.log('Últimos 20 serviços:');
console.table(rows);
await connection.end();
