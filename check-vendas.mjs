import { getDb } from "./server/db.js";
import { vendas, pagamentos } from "./drizzle/schema.js";
import { sql } from "drizzle-orm";

const db = await getDb();
if (!db) {
  console.error("Database não disponível");
  process.exit(1);
}

// Buscar todas as vendas com suas datas
const todasVendas = await db
  .select({
    id: vendas.id,
    dataVenda: vendas.dataVenda,
    valorTotal: vendas.valorTotal
  })
  .from(vendas)
  .orderBy(sql`${vendas.dataVenda} DESC`)
  .limit(10);

console.log("\n=== ÚLTIMAS 10 VENDAS NO SISTEMA ===");
console.log("Total de vendas encontradas:", todasVendas.length);

if (todasVendas.length > 0) {
  todasVendas.forEach(v => {
    const data = new Date(v.dataVenda);
    console.log(`ID: ${v.id} | Data: ${data.toISOString().split('T')[0]} | Valor: R$ ${(v.valorTotal / 100).toFixed(2)}`);
  });
  
  // Buscar vendas de hoje
  const hoje = new Date().toISOString().split('T')[0];
  const vendasHoje = await db
    .select()
    .from(vendas)
    .where(sql`DATE(${vendas.dataVenda}) = ${hoje}`);
  
  console.log(`\n=== VENDAS DE HOJE (${hoje}) ===`);
  console.log("Quantidade:", vendasHoje.length);
} else {
  console.log("Nenhuma venda encontrada no sistema");
}

process.exit(0);
