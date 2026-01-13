import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await connection.execute('DESCRIBE eventos');

console.log("\n=== COLUNAS DA TABELA EVENTOS ===\n");
rows.forEach(row => {
  console.log(`${row.Field} - ${row.Type} - ${row.Null} - ${row.Key} - ${row.Default}`);
});

// Verificar especificamente a coluna observacao
const hasObservacao = rows.some(row => row.Field === 'observacao');
console.log(`\n✓ Coluna 'observacao' existe: ${hasObservacao ? 'SIM' : 'NÃO'}`);

await connection.end();
