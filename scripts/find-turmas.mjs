import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  const [rows] = await connection.execute(`
    SELECT t.id, t.codigo, 
           (SELECT COUNT(*) FROM formandos f WHERE f.turmaId = t.id) as formandos,
           (SELECT COUNT(*) FROM eventos e WHERE e.turmaId = t.id AND e.dataEvento IS NOT NULL) as eventos
    FROM turmas t
    WHERE (SELECT COUNT(*) FROM formandos f WHERE f.turmaId = t.id) > 5
      AND (SELECT COUNT(*) FROM eventos e WHERE e.turmaId = t.id AND e.dataEvento IS NOT NULL) > 0
    LIMIT 5
  `);
  
  console.log('Turmas com formandos e eventos:');
  console.log(JSON.stringify(rows, null, 2));
  
  await connection.end();
}

main().catch(console.error);
