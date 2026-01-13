import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // Adicionar colunas de valores de Make e Cabelo na tabela turmas
  const columns = [
    'valorMakeFormandoMasc',
    'valorMakeFormandoFem',
    'valorMakeFamilia',
    'valorCabeloSimples',
    'valorCabeloCombinado'
  ];
  
  for (const col of columns) {
    try {
      await connection.execute(`ALTER TABLE turmas ADD COLUMN ${col} INT NULL`);
      console.log(`Coluna ${col} adicionada com sucesso`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log(`Coluna ${col} já existe`);
      } else {
        throw err;
      }
    }
  }
  
  console.log('Todas as colunas foram verificadas/adicionadas');
} catch (error) {
  console.error('Erro:', error.message);
} finally {
  await connection.end();
}
