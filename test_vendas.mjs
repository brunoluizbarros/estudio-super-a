import { getDadosVendasMensais } from './server/db.ts';

async function test() {
  console.log('Testando getDadosVendasMensais(2025)...');
  const resultado = await getDadosVendasMensais(2025);
  console.log('Resultado:', JSON.stringify(resultado, null, 2));
  process.exit(0);
}

test().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
