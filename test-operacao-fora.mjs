import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql, eq, and, or, gte, lte } from 'drizzle-orm';
import { despesasV2 } from './drizzle/schema.ts';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Testar para dezembro/2024
const mes = 12;
const ano = 2024;

const mesesEnum = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const mesEnum = mesesEnum[mes - 1];

console.log(`\n🔍 Testando cálculo de Operação Fora para ${mesEnum}/${ano}\n`);

// Tipos excluídos
const tiposExcluidos = [
  'Comissão',
  'Equipamentos / Utensílios / Bens',
  'Estorno',
  'Imposto',
  'Mão de Obra - Maquiadora',
  'Transferência Santander'
];

console.log('❌ Tipos EXCLUÍDOS:');
tiposExcluidos.forEach(t => console.log(`   - ${t}`));

// Buscar despesas do setor Estúdio excluindo os tipos específicos
const result = await db
  .select({
    ci: despesasV2.ci,
    tipoServicoCompra: despesasV2.tipoServicoCompra,
    valorTotal: despesasV2.valorTotal,
    mesServico: despesasV2.mesServico
  })
  .from(despesasV2)
  .where(
    and(
      eq(despesasV2.setorSolicitante, 'estudio'),
      sql`${despesasV2.mesServico} = ${mesEnum}`,
      sql`YEAR(${despesasV2.createdAt}) = ${ano}`,
      sql`${despesasV2.tipoServicoCompra} NOT IN (${tiposExcluidos.map(t => `'${t}'`).join(', ')})`
    )
  );

console.log(`\n✅ Despesas INCLUÍDAS (${result.length} registros):\n`);

let total = 0;
result.forEach(desp => {
  const valor = (desp.valorTotal || 0) / 100;
  total += valor;
  console.log(`   CI: ${desp.ci} | Tipo: ${desp.tipoServicoCompra} | Valor: R$ ${valor.toFixed(2)}`);
});

console.log(`\n💰 TOTAL OPERAÇÃO FORA: R$ ${total.toFixed(2)}\n`);

await connection.end();
