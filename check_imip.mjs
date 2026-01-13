import Database from 'better-sqlite3';
const db = new Database('./data/sqlite.db');
const rows = db.prepare("SELECT id, nome FROM locais WHERE nome LIKE '%IMIP%'").all();
console.log(JSON.stringify(rows, null, 2));
db.close();
