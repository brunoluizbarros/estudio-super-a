import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await connection.execute("DESCRIBE turmas");
console.log("Colunas da tabela turmas:");
rows.forEach(row => console.log(`- ${row.Field}: ${row.Type}`));
await connection.end();
