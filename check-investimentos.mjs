import { db } from './server/db.js';

async function checkInvestimentos() {
  try {
    // Buscar dados do sistema para dezembro 2025
    const dados = await db.getDadosSistemaFechamento(12, 2025);
    console.log('=== DADOS DO SISTEMA PARA DEZ/2025 ===');
    console.log('Dinheiro:', dados.dinheiro);
    console.log('Maquiadora:', dados.maquiadora);
    console.log('Investimentos:', dados.investimentos);
    
    // Buscar despesas de dezembro 2025
    const despesas = await db.getDespesasV2List({ mesServico: 12, anoServico: 2025 });
    console.log('\n=== DESPESAS DE DEZ/2025 ===');
    console.log('Total de despesas:', despesas.length);
    
    // Filtrar por tipo de serviço
    const investimentosDespesas = despesas.filter(d => 
      d.tipoServico && d.tipoServico.includes('Equipamentos')
    );
    console.log('Despesas de Investimentos:', investimentosDespesas.length);
    
    if (investimentosDespesas.length > 0) {
      console.log('\nDespesas encontradas:');
      investimentosDespesas.forEach(d => {
        console.log(`- CI ${d.numeroCI}: ${d.tipoServico} - R$ ${d.valor}`);
      });
    }
    
    // Listar todos os tipos de serviço únicos
    const tiposUnicos = [...new Set(despesas.map(d => d.tipoServico).filter(Boolean))];
    console.log('\n=== TIPOS DE SERVIÇO ENCONTRADOS ===');
    tiposUnicos.forEach(tipo => console.log(`- ${tipo}`));
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

checkInvestimentos();
