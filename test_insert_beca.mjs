import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log('Tentando inserir permissão para Beca...');

try {
  const [result] = await connection.execute(
    'INSERT INTO permissoes (role, secao, visualizar, inserir, excluir, tipoUsuarioId) VALUES (?, ?, ?, ?, ?, ?)',
    ['beca', 'home', true, false, false, 1]
  );
  console.log('✅ Sucesso! ID inserido:', result.insertId);
} catch (error) {
  console.error('❌ Erro:', error.message);
  console.error('Código:', error.code);
  console.error('SQL State:', error.sqlState);
}

await connection.end();
