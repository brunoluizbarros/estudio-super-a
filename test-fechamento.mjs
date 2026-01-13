import { getDb } from "./server/db.js";
import { fechamentosDiarios } from "./drizzle/schema.js";
import { sql } from "drizzle-orm";

const dataTeste = "2026-01-02";

console.log("Testando busca de fechamento para data:", dataTeste);

const db = await getDb();
if (!db) {
  console.error("Database não disponível");
  process.exit(1);
}

const result = await db
  .select()
  .from(fechamentosDiarios)
  .where(sql`DATE(${fechamentosDiarios.data}) = ${dataTeste}`)
  .limit(1);

console.log("Resultado da busca:", result);
console.log("Fechamento encontrado:", result[0] || null);

process.exit(0);
