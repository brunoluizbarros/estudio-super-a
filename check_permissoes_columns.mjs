import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar colunas da tabela
const [columns] = await connection.execute('SHOW COLUMNS FROM permissoes');
console.log('Colunas da tabela permissoes:');
columns.forEach(col => {
  console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
});

// Verificar se tipoUsuarioId existe
const hasColumn = columns.some(col => col.Field === 'tipoUsuarioId');
console.log(`\nCampo tipoUsuarioId existe? ${hasColumn ? 'SIM' : 'NÃO'}`);

await connection.end();
