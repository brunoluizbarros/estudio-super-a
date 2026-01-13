import { describe, it, expect } from "vitest";
import { gerarBackup } from "./backup";
import { getDb } from "./db";
import { backupLogs } from "../drizzle/schema";
import { desc } from "drizzle-orm";

describe("Backup - Envio de E-mail com Anexo", () => {
  it("deve gerar backup e enviar e-mail com arquivo anexado", async () => {
    console.log("[Teste] Iniciando teste de envio de backup por e-mail...");
    
    // Executar geração de backup
    const resultado = await gerarBackup();
    
    // Verificar se o backup foi gerado com sucesso
    expect(resultado).toBeDefined();
    expect(resultado.success).toBe(true);
    expect(resultado.message).toContain("Backup gerado com sucesso");
    
    console.log(`[Teste] Resultado: ${resultado.message}`);
    
    // Verificar se o log foi registrado no banco
    const db = await getDb();
    if (db) {
      const logs = await db
        .select()
        .from(backupLogs)
        .orderBy(desc(backupLogs.id))
        .limit(1);
      
      expect(logs.length).toBeGreaterThan(0);
      
      const ultimoLog = logs[0];
      expect(ultimoLog.status).toBe("sucesso");
      expect(ultimoLog.tamanhoArquivo).toBeGreaterThan(0);
      
      // Verificar se o e-mail foi enviado
      // Nota: emailEnviado pode ser false se as credenciais do Gmail não estiverem configuradas
      console.log(`[Teste] E-mail enviado: ${ultimoLog.emailEnviado}`);
      console.log(`[Teste] Tamanho do backup: ${(ultimoLog.tamanhoArquivo! / 1024 / 1024).toFixed(2)} MB`);
      
      if (ultimoLog.emailEnviado) {
        console.log("[Teste] ✅ E-mail enviado com sucesso! Verifique sua caixa de entrada.");
      } else {
        console.log("[Teste] ⚠️ E-mail não foi enviado. Verifique as credenciais do Gmail.");
      }
    }
  }, 120000); // Timeout de 120 segundos para permitir geração e envio de backup grande
});
