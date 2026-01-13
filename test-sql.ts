import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL!);

const mes = 12;
const ano = 2024;
const mesEnum = 'dezembro';

console.log(`\n🔍 Testando SQL para Operação Fora - ${mesEnum}/${ano}\n`);

const [rows] = await connection.execute(`
  SELECT 
    ci,
    tipoServicoCompra,
    valorTotal,
    mesServico,
    setorSolicitante
  FROM despesas_v2
  WHERE setorSolicitante = 'estudio'
    AND mesServico = '${mesEnum}'
    AND YEAR(createdAt) = ${ano}
    AND tipoServicoCompra NOT IN (
      'Comissão',
      'Equipamentos / Utensílios / Bens',
      'Estorno',
      'Imposto',
      'Mão de Obra - Maquiadora',
      'Transferência Santander'
    )
`) as any;

console.log(`✅ Despesas encontradas: ${rows.length}\n`);

let total = 0;
rows.forEach((row: any) => {
  const valor = (row.valorTotal || 0) / 100;
  total += valor;
  console.log(`   CI: ${row.ci} | Tipo: ${row.tipoServicoCompra} | Valor: R$ ${valor.toFixed(2)}`);
});

console.log(`\n💰 TOTAL OPERAÇÃO FORA: R$ ${total.toFixed(2)}\n`);

await connection.end();
