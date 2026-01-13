import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await connection.execute(
  "SELECT id, turmaId, tipoEvento, maquiadoras FROM eventos WHERE maquiadoras IS NOT NULL AND maquiadoras != '' AND maquiadoras != '[]' LIMIT 5"
);

console.log('Eventos com maquiadoras:');
rows.forEach(row => {
  console.log(`ID: ${row.id}, TurmaID: ${row.turmaId}, Tipo: ${row.tipoEvento}, Maquiadoras: ${row.maquiadoras}`);
});

await connection.end();
