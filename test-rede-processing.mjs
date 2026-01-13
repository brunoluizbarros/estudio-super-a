import fs from 'fs';
import { processarExtratoRede } from './server/fechamento-extratos-helper.js';

const filePath = '/home/ubuntu/upload/Rede_Rel_Recebimentos_01_12_2025-31_12_2025-0e62da66-d45a-4c6f-bd37-801e92484011.xlsx';

console.log('=== TESTE DE PROCESSAMENTO DO ARQUIVO DA REDE ===\n');

const buffer = fs.readFileSync(filePath);

console.log('Processando arquivo para dezembro/2025...\n');

const resultado = processarExtratoRede(buffer, 12, 2025);

console.log('=== RESULTADO ===');
console.log('Sucesso:', resultado.sucesso);
console.log('Valor total de tarifas:', resultado.valor);
console.log('Erro:', resultado.erro || 'Nenhum');
console.log('Detalhes:', resultado.detalhes?.length || 0, 'lançamentos');

if (resultado.detalhes && resultado.detalhes.length > 0) {
  console.log('\n=== PRIMEIROS 5 LANÇAMENTOS ===');
  resultado.detalhes.slice(0, 5).forEach((d, i) => {
    console.log(`${i + 1}. Linha ${d.linha}: Bruto R$ ${d.valorBruto} - Líquido R$ ${d.valorLiquido} = Tarifa R$ ${d.tarifa}`);
  });
}
