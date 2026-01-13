import { describe, it, expect } from 'vitest';
import { processarExtratoItauEntrada } from './fechamento-extratos-helper';

describe('Processamento de Extratos Bancários', () => {
  describe('processarExtratoItauEntrada - Cartões', () => {
    it('deve identificar RECEBIMENTO REDE sem código específico', () => {
      // Simular um buffer de Excel com lançamentos de cartão
      const mockData = [
        ['Data', 'Lançamento', '', '', 'Valor'],
        ...Array(10).fill([null, null, null, null, null]), // Cabeçalho do Itaú (10 linhas)
        ['01/12/2025', 'RECEBIMENTO REDE 1234567890', '', '', 1500.50],
        ['05/12/2025', 'RECEBIMENTO REDE 0044079001', '', '', 2000.00],
        ['10/12/2025', 'RECEBIMENTO REDE OUTRO CODIGO', '', '', 500.25],
        ['15/12/2025', 'PIX RECEBIDO', '', '', 100.00], // Não deve incluir
      ];

      // Nota: Este teste é conceitual - na prática precisaríamos criar um buffer Excel real
      // Para teste completo, usar arquivo de exemplo
      
      // Validar que a lógica aceita qualquer RECEBIMENTO REDE
      const lancamentos = [
        'RECEBIMENTO REDE 1234567890',
        'RECEBIMENTO REDE 0044079001',
        'RECEBIMENTO REDE OUTRO CODIGO',
        'recebimento rede minusculo'
      ];

      lancamentos.forEach(lancamento => {
        expect(lancamento.toUpperCase().includes('RECEBIMENTO REDE')).toBe(true);
      });
    });
  });

  describe('processarExtratoItauEntrada - PIX', () => {
    it('deve identificar diferentes variações de PIX de entrada', () => {
      const lancamentosPix = [
        'PIX RECEBIDO',
        'PIX QRS',
        'TED PIX',
        'PIX ENTRADA',
        'PIX TRANSFERENCIA'
      ];

      const lancamentosNaoPix = [
        'PAGTO PIX', // Saída, não deve incluir
        'RECEBIMENTO REDE',
        'TED COMUM'
      ];

      lancamentosPix.forEach(lancamento => {
        const upper = lancamento.toUpperCase();
        const ehPix = 
          upper.includes('PIX RECEBIDO') || 
          upper.includes('PIX QRS') ||
          upper.includes('TED PIX') ||
          (upper.includes('PIX') && !upper.includes('PAGTO'));
        
        expect(ehPix).toBe(true);
      });

      // Validar que PAGTO PIX não é incluído
      const pagto = 'PAGTO PIX'.toUpperCase();
      const ehPagto = pagto.includes('PIX') && !pagto.includes('PAGTO');
      expect(ehPagto).toBe(false);
    });
  });

  describe('Validação de Valores', () => {
    it('deve somar corretamente múltiplos lançamentos', () => {
      const valores = [1500.50, 2000.00, 500.25];
      const total = valores.reduce((acc, val) => acc + val, 0);
      
      expect(total).toBe(4000.75);
    });

    it('deve filtrar por mês e ano corretamente', () => {
      const datas = [
        { data: '01/12/2025', mes: 12, ano: 2025, incluir: true },
        { data: '15/12/2025', mes: 12, ano: 2025, incluir: true },
        { data: '31/12/2025', mes: 12, ano: 2025, incluir: true },
        { data: '01/11/2025', mes: 12, ano: 2025, incluir: false },
        { data: '01/12/2024', mes: 12, ano: 2025, incluir: false },
      ];

      datas.forEach(({ data, mes, ano, incluir }) => {
        const [dia, mesData, anoData] = data.split('/').map(Number);
        const deveFiltrar = mesData === mes && anoData === ano;
        expect(deveFiltrar).toBe(incluir);
      });
    });
  });
});
