import { getDb } from "./db";
import { backupLogs } from "../drizzle/schema";
import { sendEmail } from "./_core/email";
import { storagePut } from "./storage";

/**
 * Gera um backup completo do banco de dados e envia por e-mail
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function gerarBackup(): Promise<{ success: boolean; message: string }> {
  const dataHora = new Date();
  
  try {
    console.log("[Backup] Iniciando geração de backup...");
    
    // Obter conexão com o banco
    const db = await getDb();
    if (!db) {
      throw new Error("Banco de dados não disponível");
    }
    
    // Exportar todas as tabelas do banco de dados
    const backup = await exportarDadosBanco(db);
    
    // Converter para JSON
    const backupJson = JSON.stringify(backup, null, 2);
    const backupBuffer = Buffer.from(backupJson, 'utf-8');
    const tamanhoArquivo = backupBuffer.length;
    
    console.log(`[Backup] Backup gerado com sucesso. Tamanho: ${(tamanhoArquivo / 1024 / 1024).toFixed(2)} MB`);
    
    // Salvar no S3 (para histórico)
    const nomeArquivo = `backup-${dataHora.toISOString().replace(/[:.]/g, '-')}.json`;
    const { url: urlBackup } = await storagePut(
      `backups/${nomeArquivo}`,
      backupBuffer,
      'application/json'
    );
    
    console.log(`[Backup] Arquivo salvo no S3: ${urlBackup}`);
    
    // Enviar e-mail com arquivo anexado
    const emailEnviado = await enviarEmailBackup(urlBackup, nomeArquivo, dataHora, tamanhoArquivo, backupBuffer);
    
    // Registrar log de backup
    const dbLog = await getDb();
    if (dbLog) {
      await dbLog.insert(backupLogs).values({
      dataHora,
      status: 'sucesso',
      mensagem: `Backup gerado e ${emailEnviado ? 'enviado' : 'não enviado'} por e-mail`,
      tamanhoArquivo,
      emailEnviado,
      });
    }
    
    console.log("[Backup] Log de backup registrado com sucesso");
    
    return {
      success: true,
      message: `Backup gerado com sucesso. Tamanho: ${(tamanhoArquivo / 1024 / 1024).toFixed(2)} MB. E-mail ${emailEnviado ? 'enviado' : 'não enviado'}.`
    };
    
  } catch (error) {
    console.error("[Backup] Erro ao gerar backup:", error);
    
    // Registrar log de erro
    const dbLog = await getDb();
    if (dbLog) {
      await dbLog.insert(backupLogs).values({
      dataHora,
      status: 'erro',
      mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
      emailEnviado: false,
      });
    }
    
    return {
      success: false,
      message: `Erro ao gerar backup: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Exporta todos os dados do banco de dados
 */
async function exportarDadosBanco(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  console.log("[Backup] Exportando dados do banco...");
  
  // Lista de todas as tabelas para exportar
  const tabelas = [
    'users',
    'tipos_usuario',
    'instituicoes',
    'cursos',
    'cidades',
    'locais',
    'tipos_servico',
    'tipos_evento',
    'fornecedores',
    'tabela_preco_fornecedores',
    'turmas',
    'formandos',
    'eventos',
    'agendamentos',
    'servicosAgendados',
    'cenarios',
    'vendas',
    'itensVenda',
    'pagamentos',
    'produtos',
    'taxasCartao',
    'despesas',
    'despesas_v2',
    'despesas_v2_anexos',
    'despesas_v2_datas',
    'despesas_v2_historico',
    'despesas_v2_turmas',
    'anexos_despesas',
    'sequencia_ci',
    'permissoes',
    'permissoes_configuracoes',
    'permissoes_relatorios',
    'execucao_formando',
    'servicos_execucao',
    'fotos_formando',
    'tipos_cenario',
    'configMaquiagem',
    'configMaquiagemTurma',
    'notificacoes',
    'reunioes',
    'briefing_evento',
    'briefing_formando',
    'briefing_grupo',
    'horarios_briefing',
    'historico_observacoes',
    'historico_alteracoes_vendas',
    'usuario_turmas',
    'fechamentos_diarios',
    'fechamentos_mensais',
    'divergencias_fechamento',
    'extratos_uploads',
    'transacoes_rede',
    'backup_logs'
  ];
  
  const backup: Record<string, any> = {};
  
  backup.metadata = {
    dataGeracao: new Date().toISOString(),
    versao: '1.0',
    totalTabelas: tabelas.length
  };
  
  // Exportar cada tabela
  for (const tabela of tabelas) {
    try {
      const dados = await db.execute(`SELECT * FROM ${tabela}`);
      backup[tabela] = Array.isArray(dados) ? dados : [];
      console.log(`[Backup] Tabela ${tabela}: ${backup[tabela].length} registros`);
    } catch (error) {
      console.error(`[Backup] Erro ao exportar tabela ${tabela}:`, error);
      backup[tabela] = [];
    }
  }
  
  return backup;
}

/**
 * Envia e-mail com link para download do backup
 */
async function enviarEmailBackup(urlBackup: string, nomeArquivo: string, dataHora: Date, tamanhoArquivo: number, backupBuffer: Buffer): Promise<boolean> {
  try {
    console.log("[Backup] Enviando e-mail...");
    
    const tamanhoMB = (tamanhoArquivo / 1024 / 1024).toFixed(2);
    const tamanhoMBNumero = tamanhoArquivo / 1024 / 1024;
    const incluirAnexo = tamanhoMBNumero < 20; // Apenas anexar se menor que 20 MB
    
    console.log(`[Backup] Tamanho do arquivo: ${tamanhoMB} MB. Anexo ${incluirAnexo ? 'será incluído' : 'NÃO será incluído (muito grande)'}.`);
    const dataFormatada = dataHora.toLocaleString('pt-BR', { 
      timeZone: 'America/Recife',
      dateStyle: 'full',
      timeStyle: 'short'
    });
    
    await sendEmail({
      to: process.env.OWNER_EMAIL || 'suporteplataforma@superaformaturas.com.br',
      subject: `Backup Automático - ${dataFormatada}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Backup Automático do Sistema</h2>
          
          <p>Olá,</p>
          
          <p>O backup automático diário do sistema <strong>Estúdio Super A Formaturas</strong> foi gerado com sucesso.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Data/Hora:</strong> ${dataFormatada}</p>
            <p style="margin: 5px 0;"><strong>Tamanho:</strong> ${tamanhoMB} MB</p>
          </div>
          
          <p><strong>${incluirAnexo ? 'O arquivo de backup está anexado a este e-mail.' : 'O arquivo de backup é muito grande para ser anexado ('+tamanhoMB+' MB). Use o link abaixo para download:'}</strong></p>
          
          <p>${incluirAnexo ? 'Você também pode baixar o backup através do link abaixo (disponível por tempo limitado):' : 'Link para download do backup:'}</p>
          
          <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
            <a href="${urlBackup}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0;">📥 Baixar Backup (${tamanhoMB} MB)</a>
            <p style="margin: 10px 0 5px 0; color: #1e40af; font-size: 12px; word-break: break-all;">${nomeArquivo}</p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Este é um e-mail automático gerado pelo sistema. O backup é realizado diariamente às 00:55 (horário de Recife).
          </p>
          
          <p style="color: #6b7280; font-size: 14px;">
            <strong>Importante:</strong> Mantenha os arquivos de backup em local seguro e faça cópias adicionais periodicamente.
          </p>
        </div>
      `,
      text: `
Backup Automático do Sistema

O backup automático diário do sistema Estúdio Super A Formaturas foi gerado com sucesso.

Data/Hora: ${dataFormatada}
Tamanho: ${tamanhoMB} MB

${incluirAnexo ? 'O arquivo de backup está anexado a este e-mail.\n\nVocê também pode baixar o backup através do seguinte link (disponível por tempo limitado):' : 'O arquivo de backup é muito grande para ser anexado ('+tamanhoMB+' MB).\n\nUse o link abaixo para download do backup:'}
${urlBackup}

Nome do arquivo: ${nomeArquivo}
Tamanho: ${tamanhoMB} MB

Este é um e-mail automático gerado pelo sistema. O backup é realizado diariamente às 00:55 (horário de Recife).

Importante: Mantenha os arquivos de backup em local seguro e faça cópias adicionais periodicamente.
      `,
      attachments: incluirAnexo ? [
        {
          filename: nomeArquivo,
          content: backupBuffer,
          contentType: 'application/json'
        }
      ] : undefined
    });
    
    console.log("[Backup] E-mail enviado com sucesso");
    return true;
    
  } catch (error) {
    console.error("[Backup] Erro ao enviar e-mail:", error);
    return false;
  }
}
