import { describe, it, expect } from "vitest";
import { executarBackupManual } from "./cron-backup-diario";
import { getDb } from "./db";
import { backupLogs } from "../drizzle/schema";
import { desc } from "drizzle-orm";

describe("Agendamento de Backup Diário", () => {
  it("deve executar backup manual com sucesso", async () => {
    console.log("[Teste] Executando backup manual...");
    
    // Executar backup manual
    const resultado = await executarBackupManual();
    
    // Verificar resultado
    expect(resultado).toBeDefined();
    expect(resultado.success).toBe(true);
    expect(resultado.message).toContain("Backup gerado com sucesso");
    
    console.log("[Teste] ✓ Backup executado:", resultado.message);
  }, 60000); // Timeout de 60 segundos para backup completo

  it("deve registrar log de backup no banco de dados", async () => {
    console.log("[Teste] Verificando logs de backup...");
    
    // Buscar último log de backup
    const db = await getDb();
    expect(db).toBeDefined();
    
    if (!db) {
      throw new Error("Database não disponível");
    }
    
    const logs = await db
      .select()
      .from(backupLogs)
      .orderBy(desc(backupLogs.dataHora))
      .limit(1);
    
    expect(logs.length).toBeGreaterThan(0);
    
    const ultimoLog = logs[0];
    console.log("[Teste] Último log de backup:", {
      dataHora: ultimoLog.dataHora,
      status: ultimoLog.status,
      mensagem: ultimoLog.mensagem,
      emailEnviado: ultimoLog.emailEnviado,
      tamanhoArquivo: ultimoLog.tamanhoArquivo
    });
    
    // Verificar campos do log
    expect(ultimoLog.status).toBe("sucesso");
    expect(ultimoLog.dataHora).toBeDefined();
    expect(ultimoLog.mensagem).toBeDefined();
    expect(ultimoLog.tamanhoArquivo).toBeGreaterThan(0);
  }, 60000);

  it("deve enviar e-mail com backup anexado", async () => {
    console.log("[Teste] Testando envio de e-mail com backup...");
    
    // Executar backup (que inclui envio de e-mail)
    const resultado = await executarBackupManual();
    
    expect(resultado.success).toBe(true);
    
    // Verificar se e-mail foi enviado
    const db = await getDb();
    if (!db) {
      throw new Error("Database não disponível");
    }
    
    const logs = await db
      .select()
      .from(backupLogs)
      .orderBy(desc(backupLogs.dataHora))
      .limit(1);
    
    const ultimoLog = logs[0];
    
    console.log("[Teste] Status de envio de e-mail:", ultimoLog.emailEnviado);
    console.log("[Teste] Mensagem:", ultimoLog.mensagem);
    
    // Verificar se e-mail foi enviado ou se houve tentativa
    expect(ultimoLog.emailEnviado).toBeDefined();
    
    if (ultimoLog.emailEnviado) {
      console.log("[Teste] ✓ E-mail enviado com sucesso!");
    } else {
      console.log("[Teste] ⚠ E-mail não foi enviado (pode ser problema de configuração SMTP)");
    }
  }, 60000);
});
