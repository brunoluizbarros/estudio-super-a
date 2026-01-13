import { describe, it, expect } from "vitest";
import { sendEmail } from "./_core/email";

describe("Gmail Email Integration", () => {
  it("should send test email successfully", async () => {
    const result = await sendEmail({
      to: "gestao@superaformaturas.com.br",
      subject: "Teste de Integração - Sistema Estúdio Super A",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">✅ Teste de Integração Gmail API</h2>
          <p>Este é um e-mail de teste para validar a integração com Gmail API.</p>
          <p><strong>Sistema:</strong> Estúdio Super A - Gestão de Despesas</p>
          <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            Se você recebeu este e-mail, significa que a integração está funcionando corretamente! 🎉
          </p>
        </div>
      `,
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  }, 30000); // 30 segundos de timeout para envio de e-mail
});
