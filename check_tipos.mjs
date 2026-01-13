import Database from "better-sqlite3";

const db = new Database(process.env.DATABASE_URL || "./local.db");

console.log("=== Tipos de Usuário no Banco ===");
const tipos = db.prepare("SELECT * FROM tipos_usuario ORDER BY id").all();
console.log(JSON.stringify(tipos, null, 2));

db.close();
