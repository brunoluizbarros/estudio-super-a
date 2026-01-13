import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await connection.execute(`
  SELECT 
    t.codigo,
    t.cursos,
    t.instituicoes,
    t.numeroTurma,
    t.anos,
    t.periodos,
    COUNT(f.id) as totalFormandos
  FROM formandos f
  INNER JOIN turmas t ON f.turmaId = t.id
  GROUP BY t.id, t.codigo, t.cursos, t.instituicoes, t.numeroTurma, t.anos, t.periodos
  ORDER BY COUNT(f.id) DESC
`);

console.log('\n=== TURMAS COM FORMANDOS REGISTRADOS ===\n');
console.log(`Total de turmas com formandos: ${rows.length}`);
console.log(`Total geral de formandos: ${rows.reduce((sum, t) => sum + Number(t.totalFormandos), 0)}\n`);

rows.forEach((turma, index) => {
  const cursos = JSON.parse(turma.cursos || '[]');
  const instituicoes = JSON.parse(turma.instituicoes || '[]');
  const anos = JSON.parse(turma.anos || '[]');
  const periodos = JSON.parse(turma.periodos || '[]');
  
  const cursoStr = cursos[0] || '';
  const instituicaoStr = instituicoes[0] || '';
  const anoStr = anos[0] || '';
  const periodoStr = periodos[0] || '';
  
  console.log(`${index + 1}. Turma ${turma.codigo} - ${cursoStr} ${instituicaoStr} ${turma.numeroTurma || ''} ${anoStr}.${periodoStr}`);
  console.log(`   Formandos: ${turma.totalFormandos}\n`);
});

await connection.end();
