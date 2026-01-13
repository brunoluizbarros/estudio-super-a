import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
const connection = await mysql.createConnection(DATABASE_URL);

// Contar eventos de Janeiro/2026 em diante
const [eventos] = await connection.query(`
  SELECT 
    COUNT(*) as total,
    MIN(dataEvento) as primeira_data,
    MAX(dataEvento) as ultima_data
  FROM eventos
  WHERE YEAR(dataEvento) >= 2026
`);

console.log('📊 Eventos de Janeiro/2026 em diante:');
console.log(eventos[0]);

// Contar por tipo de evento
const [porTipo] = await connection.query(`
  SELECT tipoEvento, COUNT(*) as total
  FROM eventos
  WHERE YEAR(dataEvento) >= 2026
  GROUP BY tipoEvento
  ORDER BY tipoEvento
`);

console.log('\n📋 Distribuição por tipo de evento:');
porTipo.forEach(row => {
  console.log(`  ${row.tipoEvento}: ${row.total}`);
});

// Contar por turma
const [porTurma] = await connection.query(`
  SELECT t.codigo, COUNT(*) as total
  FROM eventos e
  JOIN turmas t ON e.turmaId = t.id
  WHERE YEAR(e.dataEvento) >= 2026
  GROUP BY e.turmaId
  ORDER BY t.codigo
`);

console.log('\n🎓 Distribuição por turma (primeiras 10):');
porTurma.slice(0, 10).forEach(row => {
  console.log(`  Turma ${row.codigo}: ${row.total}`);
});

// Verificar locais
const [comLocal] = await connection.query(`
  SELECT COUNT(*) as total FROM eventos
  WHERE YEAR(dataEvento) >= 2026 AND local IS NOT NULL AND local != ''
`);

console.log(`\n📍 Eventos com local preenchido: ${comLocal[0].total}`);

await connection.end();
