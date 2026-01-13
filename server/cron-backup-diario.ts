/**
 * Agendamento de Backup Diário
 * 
 * Executa backup automático do banco de dados diariamente às 00:55 (horário de Recife/PE - UTC-3)
 * e envia por e-mail para suporteplataforma@superaformaturas.com.br
 */

import cron from 'node-cron';
import { gerarBackup } from './backup';

/**
 * Inicia o agendamento de backup diário
 */
export function iniciarAgendamentoBackup() {
  // Agendar para 00:55 todos os dias (horário de Recife - UTC-3)
  // Cron expression: '55 0 * * *' = minuto 55, hora 0, todos os dias
  const cronExpression = '55 0 * * *';
  
  console.log('[Backup Agendado] Inicializando agendamento de backup diário às 00:55 (horário de Recife)');
  
  cron.schedule(cronExpression, async () => {
    console.log('[Backup Agendado] Iniciando execução de backup automático...');
    
    try {
      const resultado = await gerarBackup();
      
      if (resultado.success) {
        console.log('[Backup Agendado] ✓ Backup executado com sucesso:', resultado.message);
      } else {
        console.error('[Backup Agendado] ✗ Erro ao executar backup:', resultado.message);
      }
    } catch (error) {
      console.error('[Backup Agendado] ✗ Erro fatal ao executar backup:', error);
    }
  }, {
    timezone: 'America/Recife' // Horário de Recife/PE (UTC-3)
  });
  
  console.log('[Backup Agendado] ✓ Agendamento configurado com sucesso');
  console.log('[Backup Agendado] Próxima execução: todos os dias às 00:55 (horário de Recife)');
}

/**
 * Executa backup imediatamente (para testes)
 */
export async function executarBackupManual() {
  console.log('[Backup Manual] Executando backup manual...');
  
  try {
    const resultado = await gerarBackup();
    
    if (resultado.success) {
      console.log('[Backup Manual] ✓ Backup executado com sucesso:', resultado.message);
    } else {
      console.error('[Backup Manual] ✗ Erro ao executar backup:', resultado.message);
    }
    
    return resultado;
  } catch (error) {
    console.error('[Backup Manual] ✗ Erro fatal ao executar backup:', error);
    return {
      success: false,
      message: `Erro fatal: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

// Se executado diretamente, executa backup manual
if (import.meta.url === `file://${process.argv[1]}`) {
  executarBackupManual()
    .then(() => {
      console.log('[Backup Manual] Script finalizado');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Backup Manual] Erro fatal:', err);
      process.exit(1);
    });
}
