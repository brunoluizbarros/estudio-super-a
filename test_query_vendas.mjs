import mysql from 'mysql2/promise';
import 'dotenv/config';

async function test() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('=== TESTANDO QUERY DE VENDAS ===\n');
  
  // Ver uma venda
  const [vendas] = await connection.query(`
    SELECT id, dataVenda, YEAR(dataVenda) as ano, MONTH(dataVenda) as mes, valorTotal, excluido
    FROM vendas 
    WHERE excluido = 0 
    LIMIT 3
  `);
  
  console.log('Vendas encontradas:', vendas.length);
  console.log(JSON.stringify(vendas, null, 2));
  
  console.log('\n=== TESTANDO QUERY AGREGADA ===\n');
  
  // Testar query agregada para 2025
  const [resultado2025] = await connection.query(`
    SELECT 
      MONTH(dataVenda) as mes,
      COALESCE(SUM(valorTotal), 0) as totalBruto,
      COUNT(*) as quantidade
    FROM vendas
    WHERE YEAR(dataVenda) = 2025
      AND excluido = 0
    GROUP BY MONTH(dataVenda)
    ORDER BY MONTH(dataVenda)
  `);
  
  console.log('Resultado 2025:');
  console.log(JSON.stringify(resultado2025, null, 2));
  
  await connection.end();
}

test().catch(console.error);
