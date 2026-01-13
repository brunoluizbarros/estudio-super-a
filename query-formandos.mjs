import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { formandos, turmas } from './drizzle/schema.ts';
import { eq, count, sql } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Buscar turmas com formandos e contar
const resultado = await db
  .select({
    turmaId: formandos.turmaId,
    codigo: turmas.codigo,
    cursos: turmas.cursos,
    instituicoes: turmas.instituicoes,
    numeroTurma: turmas.numeroTurma,
    anos: turmas.anos,
    periodos: turmas.periodos,
    totalFormandos: count(formandos.id)
  })
  .from(formandos)
  .innerJoin(turmas, eq(formandos.turmaId, turmas.id))
  .groupBy(formandos.turmaId, turmas.codigo, turmas.cursos, turmas.instituicoes, turmas.numeroTurma, turmas.anos, turmas.periodos)
  .orderBy(sql`count(${formandos.id}) DESC`);

console.log('\n=== TURMAS COM FORMANDOS REGISTRADOS ===\n');
console.log(`Total de turmas com formandos: ${resultado.length}`);
console.log(`Total geral de formandos: ${resultado.reduce((sum, t) => sum + t.totalFormandos, 0)}\n`);

resultado.forEach((turma, index) => {
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
