import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await connection.execute('SELECT DISTINCT role FROM permissoes ORDER BY role');
console.log('Roles existentes no banco de dados:');
rows.forEach(row => {
  console.log(`- "${row.role}"`);
});

await connection.end();
