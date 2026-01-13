import nodemailer from 'nodemailer';
import { ENV } from './env';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Envia e-mail usando Gmail com App Password
 * Requer as seguintes variáveis de ambiente:
 * - GMAIL_USER: E-mail do remetente (ex: gestao@superaformaturas.com.br)
 * - GMAIL_APP_PASSWORD: Senha de app do Google (16 caracteres)
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Verificar se as credenciais estão configuradas
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      console.warn('[Email] Gmail credentials not configured. Skipping email send.');
      return { success: false, error: 'Credentials not configured' };
    }

    // Criar transporter com App Password
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    // Enviar e-mail
    const info = await transporter.sendMail({
      from: `Estúdio Super A <${gmailUser}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Fallback para texto plano
      attachments: options.attachments,
    });

    console.log(`[Email] Email sent successfully to ${options.to} - MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Template de e-mail para notificação de despesa
 */
export function buildDespesaEmailTemplate(params: {
  titulo: string;
  mensagem: string;
  numeroCi: string;
  fornecedor: string;
  valor: string;
  tipoDespesa: string;
  justificativa?: string;
  linkSistema: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f0f0f0;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 10px;
    }
    h1 {
      color: #1a1a1a;
      font-size: 22px;
      margin: 0 0 10px 0;
    }
    .message {
      font-size: 16px;
      color: #666;
      margin-bottom: 25px;
    }
    .details {
      background-color: #f8f9fa;
      border-left: 4px solid #007bff;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .details-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .details-row:last-child {
      border-bottom: none;
    }
    .details-label {
      font-weight: 600;
      color: #495057;
    }
    .details-value {
      color: #212529;
      text-align: right;
    }
    .justificativa {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .justificativa-title {
      font-weight: 600;
      color: #856404;
      margin-bottom: 8px;
    }
    .justificativa-text {
      color: #856404;
      font-style: italic;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #007bff;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 5px;
      font-weight: 600;
      margin: 25px 0;
      text-align: center;
    }
    .button:hover {
      background-color: #0056b3;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #f0f0f0;
      font-size: 14px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ESTÚDIO SUPER A</div>
      <h1>${params.titulo}</h1>
    </div>
    
    <div class="message">
      ${params.mensagem}
    </div>
    
    <div class="details">
      <div class="details-row">
        <span class="details-label">Número da CI:</span>
        <span class="details-value">${params.numeroCi}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Fornecedor:</span>
        <span class="details-value">${params.fornecedor}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Valor:</span>
        <span class="details-value">${params.valor}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Tipo:</span>
        <span class="details-value">${params.tipoDespesa}</span>
      </div>
    </div>
    
    ${params.justificativa ? `
    <div class="justificativa">
      <div class="justificativa-title">Justificativa da Rejeição:</div>
      <div class="justificativa-text">${params.justificativa}</div>
    </div>
    ` : ''}
    
    <div style="text-align: center;">
      <a href="${params.linkSistema}" class="button">Acessar Sistema</a>
    </div>
    
    <div class="footer">
      Este é um e-mail automático. Por favor, não responda.<br>
      © ${new Date().getFullYear()} Estúdio Super A Formaturas
    </div>
  </div>
</body>
</html>
  `.trim();
}
