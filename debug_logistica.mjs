import { getDb } from "./server/db.js";
import { permissoes, tiposUsuario } from "./drizzle/schema.js";
import { eq } from "drizzle-orm";

const db = await getDb();

console.log("\n=== TIPO USUÁRIO LOGÍSTICA ===");
const [tipoLog] = await db.select().from(tiposUsuario).where(eq(tiposUsuario.nome, "Logística"));
console.log(JSON.stringify(tipoLog, null, 2));

console.log("\n=== PERMISSÕES LOGISTICA (primeiras 5) ===");
const perms = await db.select().from(permissoes).where(eq(permissoes.role, "logistica")).limit(5);
perms.forEach(p => {
  console.log(`ID: ${p.id}, Seção: ${p.secao}, tipoUsuarioId: ${p.tipoUsuarioId}, V:${p.visualizar}, I:${p.inserir}, E:${p.excluir}`);
});

console.log("\n=== TODAS AS PERMISSÕES LOGISTICA ===");
const allPerms = await db.select().from(permissoes).where(eq(permissoes.role, "logistica"));
console.log(`Total: ${allPerms.length} permissões`);
console.log("Seções:", allPerms.map(p => p.secao).join(", "));

process.exit(0);
