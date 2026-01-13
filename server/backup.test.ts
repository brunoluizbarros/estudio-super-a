import { describe, it, expect, beforeAll } from "vitest";
import { gerarBackup } from "./backup";
import { getDb } from "./db";
import { backupLogs } from "../drizzle/schema";
import { desc } from "drizzle-orm";

describe("Sistema de Backup", () => {
  beforeAll(async () => {
    // Aguardar conexão com o banco
    const db = await getDb();
    expect(db).toBeDefined();
  });

  it("deve gerar backup com sucesso", async () => {
    // Executar geração de backup
    const resultado = await gerarBackup();
    
    // Verificar se o backup foi gerado com sucesso
    expect(resultado).toBeDefined();
    expect(resultado.success).toBe(true);
    expect(resultado.message).toContain("Backup gerado com sucesso");
    
    // Verificar se o log foi registrado no banco
    const db = await getDb();
    if (db) {
      const logs = await db.select()
        .from(backupLogs)
        .orderBy(desc(backupLogs.createdAt))
        .limit(1);
      
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].status).toBe("sucesso");
      expect(logs[0].tamanhoArquivo).toBeGreaterThan(0);
    }
  }, 60000); // Timeout de 60 segundos para permitir geração completa do backup

  it("deve registrar tamanho do arquivo no log", async () => {
    const db = await getDb();
    if (db) {
      const logs = await db.select()
        .from(backupLogs)
        .orderBy(desc(backupLogs.createdAt))
        .limit(1);
      
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].tamanhoArquivo).toBeDefined();
      expect(logs[0].tamanhoArquivo).toBeGreaterThan(0);
      
      // Verificar se o tamanho está em bytes (deve ser maior que 1KB)
      expect(logs[0].tamanhoArquivo!).toBeGreaterThan(1024);
    }
  });

  it("deve ter registrado tentativa de envio de e-mail", async () => {
    const db = await getDb();
    if (db) {
      const logs = await db.select()
        .from(backupLogs)
        .orderBy(desc(backupLogs.createdAt))
        .limit(1);
      
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].emailEnviado).toBeDefined();
      // O e-mail pode ter sido enviado ou não, dependendo da configuração
      // Mas o campo deve estar presente
    }
  });
});
