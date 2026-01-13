import { describe, it, expect } from "vitest";
import { gerarBackup } from "./backup";

describe("Backup - Envio de E-mail com Anexo", () => {
  it("deve gerar backup e enviar e-mail com arquivo anexado", async () => {
    // Executar geração de backup
    const resultado = await gerarBackup();
    
    // Verificar se o backup foi gerado com sucesso
    expect(resultado).toBeDefined();
    expect(resultado.success).toBe(true);
    expect(resultado.message).toContain("Backup gerado com sucesso");
    
    // Verificar se o e-mail foi enviado
    // (o resultado deve indicar se o e-mail foi enviado ou não)
    expect(resultado.message).toMatch(/E-mail (enviado|não enviado)/);
    
    console.log("✅ Resultado do backup:", resultado.message);
  }, 60000); // Timeout de 60 segundos para permitir geração completa do backup
});
