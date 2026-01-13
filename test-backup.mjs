import { gerarBackup } from './server/backup.js';

async function testarBackup() {
  console.log('='.repeat(60));
  console.log('TESTE DE BACKUP E ENVIO POR E-MAIL');
  console.log('='.repeat(60));
  console.log('');
  
  try {
    console.log('🔄 Iniciando geração de backup...');
    console.log('');
    
    const resultado = await gerarBackup();
    
    console.log('');
    console.log('='.repeat(60));
    console.log('RESULTADO DO TESTE');
    console.log('='.repeat(60));
    console.log('');
    
    if (resultado.success) {
      console.log('✅ SUCESSO!');
      console.log('');
      console.log(resultado.message);
      console.log('');
      console.log('📧 Verifique sua caixa de entrada do e-mail configurado.');
      console.log('   O e-mail deve conter:');
      console.log('   - Assunto: Backup Automático - [data/hora]');
      console.log('   - Anexo: arquivo JSON com o backup completo');
      console.log('');
    } else {
      console.log('❌ ERRO!');
      console.log('');
      console.log(resultado.message);
      console.log('');
    }
    
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ ERRO CRÍTICO');
    console.error('='.repeat(60));
    console.error('');
    console.error('Erro:', error.message);
    console.error('');
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    console.error('');
    console.error('='.repeat(60));
    process.exit(1);
  }
}

testarBackup();
