import mysql from 'mysql2/promise';

async function debug() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('=== DESPESAS DE EQUIPAMENTOS EM DEZ/2025 ===');
  const [despesas] = await connection.execute(`
    SELECT numeroCi, tipoServicoCompra, valorTotal, valorTotal/100 as valorReais, mesServico, createdAt 
    FROM despesas_v2 
    WHERE mesServico = 'dezembro' 
      AND YEAR(createdAt) = 2025
      AND tipoServicoCompra LIKE '%Equipamentos%'
  `);
  
  console.log('Total de despesas:', despesas.length);
  despesas.forEach(d => {
    console.log(`CI ${d.numeroCi}: ${d.tipoServicoCompra} - R$ ${d.valorReais} (${d.valorTotal} centavos)`);
  });
  
  console.log('\n=== SOMA TOTAL ===');
  const [resultado] = await connection.execute(`
    SELECT SUM(valorTotal) as totalCentavos, SUM(valorTotal)/100 as totalReais
    FROM despesas_v2 
    WHERE mesServico = 'dezembro' 
      AND YEAR(createdAt) = 2025
      AND tipoServicoCompra LIKE '%Equipamentos%'
  `);
  
  console.log('Total em centavos:', resultado[0].totalCentavos);
  console.log('Total em reais:', resultado[0].totalReais);
  
  await connection.end();
}

debug().catch(console.error);
