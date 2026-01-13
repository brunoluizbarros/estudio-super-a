// Testar função diretamente
import { getDadosVendasMensais } from './server/db.ts';

console.log('=== TESTANDO getDadosVendasMensais DIRETAMENTE ===\n');

try {
  const resultado2025 = await getDadosVendasMensais(2025);
  console.log('Resultado 2025:');
  console.log(JSON.stringify(resultado2025, null, 2));
  
  const resultado2026 = await getDadosVendasMensais(2026);
  console.log('\nResultado 2026:');
  console.log(JSON.stringify(resultado2026, null, 2));
} catch (error) {
  console.error('Erro:', error);
}

process.exit(0);
