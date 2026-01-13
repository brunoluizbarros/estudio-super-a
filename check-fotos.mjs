import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '4000'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

const [rows] = await connection.execute(`
  SELECT execucaoFormandoId, COUNT(*) as total 
  FROM fotos_formando 
  GROUP BY execucaoFormandoId 
  ORDER BY total DESC 
  LIMIT 20
`);

console.log('Registros por execucaoFormandoId:');
console.table(rows);

const [allRows] = await connection.execute(`
  SELECT ff.id, ff.execucaoFormandoId, ff.cenarioId, ff.fotografoId, ff.numeroArquivos, ff.createdAt 
  FROM fotos_formando ff 
  ORDER BY ff.id DESC 
  LIMIT 30
`);

console.log('\nÚltimos 30 registros:');
console.table(allRows);

await connection.end();
