import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await connection.execute('SELECT role, secao, visualizar, inserir, excluir FROM permissoes ORDER BY role, secao');

// Agrupar por role
const byRole = {};
rows.forEach(row => {
  if (!byRole[row.role]) {
    byRole[row.role] = [];
  }
  byRole[row.role].push(row);
});

console.log('='.repeat(80));
console.log('MATRIZ DE PERMISSÕES POR TIPO DE USUÁRIO');
console.log('='.repeat(80));

Object.keys(byRole).sort().forEach(role => {
  console.log(`\n📋 ${role.toUpperCase()}`);
  console.log('-'.repeat(80));
  
  const permissoes = byRole[role];
  console.log(`Total de permissões: ${permissoes.length}`);
  console.log('');
  
  permissoes.forEach(p => {
    const v = p.visualizar ? '✅' : '❌';
    const i = p.inserir ? '✅' : '❌';
    const e = p.excluir ? '✅' : '❌';
    console.log(`  ${p.secao.padEnd(25)} | V:${v} I:${i} E:${e}`);
  });
});

console.log('\n' + '='.repeat(80));
console.log(`TOTAL GERAL: ${rows.length} permissões cadastradas`);
console.log('='.repeat(80));

await connection.end();
