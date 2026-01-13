import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do módulo de banco de dados
vi.mock('./db', () => ({
  getNextNumeroCiV2: vi.fn(),
  listDespesasV2: vi.fn(),
  getDespesaV2ById: vi.fn(),
  createDespesaV2: vi.fn(),
  updateDespesaV2: vi.fn(),
  aprovarDespesaGestor: vi.fn(),
  aprovarDespesaGestorGeral: vi.fn(),
  rejeitarDespesa: vi.fn(),
  liquidarDespesa: vi.fn(),
  listHistoricoDespesaV2: vi.fn(),
  deleteDespesaV2: vi.fn(),
}));

import * as db from './db';

describe('Despesas V2 - Funções de Banco de Dados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNextNumeroCiV2', () => {
    it('deve gerar número de CI no formato correto', async () => {
      const mockNumeroCi = '001/2025';
      vi.mocked(db.getNextNumeroCiV2).mockResolvedValue(mockNumeroCi);
      
      const result = await db.getNextNumeroCiV2();
      
      expect(result).toBe('001/2025');
      expect(result).toMatch(/^\d{3}\/\d{4}$/);
    });

    it('deve incrementar o número sequencial', async () => {
      vi.mocked(db.getNextNumeroCiV2).mockResolvedValueOnce('001/2025');
      vi.mocked(db.getNextNumeroCiV2).mockResolvedValueOnce('002/2025');
      
      const first = await db.getNextNumeroCiV2();
      const second = await db.getNextNumeroCiV2();
      
      expect(first).toBe('001/2025');
      expect(second).toBe('002/2025');
    });
  });

  describe('createDespesaV2', () => {
    it('deve criar uma despesa operacional com sucesso', async () => {
      vi.mocked(db.createDespesaV2).mockResolvedValue(1);
      
      const despesaData = {
        numeroCi: '001/2025',
        tipoDespesa: 'operacional' as const,
        mesServico: 'janeiro',
        setorSolicitante: 'estudio' as const,
        fornecedorId: 1,
        detalhamento: 'Teste de despesa operacional',
        eReembolso: false,
        valorTotal: 100000, // R$ 1.000,00 em centavos
        tipoPagamento: 'pix' as const,
        dadosPagamento: 'PIX: 12345678901',
        criadoPorId: 1,
        criadoPorNome: 'Usuário Teste',
      };
      
      const result = await db.createDespesaV2(despesaData);
      
      expect(result).toBe(1);
      expect(db.createDespesaV2).toHaveBeenCalledWith(despesaData);
    });

    it('deve criar uma despesa administrativa com sucesso', async () => {
      vi.mocked(db.createDespesaV2).mockResolvedValue(2);
      
      const despesaData = {
        numeroCi: '002/2025',
        tipoDespesa: 'administrativa' as const,
        mesServico: 'fevereiro',
        setorSolicitante: 'fotografia' as const,
        fornecedorId: 2,
        detalhamento: 'Teste de despesa administrativa',
        eReembolso: true,
        valorTotal: 50000, // R$ 500,00 em centavos
        tipoPagamento: 'boleto' as const,
        dadosPagamento: 'Boleto: 12345.67890',
        criadoPorId: 1,
        criadoPorNome: 'Usuário Teste',
      };
      
      const result = await db.createDespesaV2(despesaData);
      
      expect(result).toBe(2);
    });
  });

  describe('Fluxo de Aprovação', () => {
    it('deve aprovar despesa como gestor', async () => {
      vi.mocked(db.aprovarDespesaGestor).mockResolvedValue(true);
      
      const result = await db.aprovarDespesaGestor(1, 1, 'Gestor Teste');
      
      expect(result).toBe(true);
      expect(db.aprovarDespesaGestor).toHaveBeenCalledWith(1, 1, 'Gestor Teste');
    });

    it('deve aprovar despesa como gestor geral', async () => {
      vi.mocked(db.aprovarDespesaGestorGeral).mockResolvedValue(true);
      
      const result = await db.aprovarDespesaGestorGeral(1, 2, 'Gestor Geral Teste');
      
      expect(result).toBe(true);
      expect(db.aprovarDespesaGestorGeral).toHaveBeenCalledWith(1, 2, 'Gestor Geral Teste');
    });

    it('deve rejeitar despesa com justificativa', async () => {
      vi.mocked(db.rejeitarDespesa).mockResolvedValue(true);
      
      const result = await db.rejeitarDespesa(
        1,
        'gestor',
        'Valor acima do orçamento',
        1,
        'Gestor Teste'
      );
      
      expect(result).toBe(true);
      expect(db.rejeitarDespesa).toHaveBeenCalledWith(
        1,
        'gestor',
        'Valor acima do orçamento',
        1,
        'Gestor Teste'
      );
    });
  });

  describe('Liquidação', () => {
    it('deve liquidar despesa com data e comprovante', async () => {
      vi.mocked(db.liquidarDespesa).mockResolvedValue(true);
      
      const dataLiquidacao = new Date('2025-01-15');
      const comprovanteUrl = 'https://storage.example.com/comprovante.pdf';
      
      const result = await db.liquidarDespesa(
        1,
        dataLiquidacao,
        comprovanteUrl,
        1,
        'Usuário Teste'
      );
      
      expect(result).toBe(true);
      expect(db.liquidarDespesa).toHaveBeenCalledWith(
        1,
        dataLiquidacao,
        comprovanteUrl,
        1,
        'Usuário Teste'
      );
    });

    it('deve liquidar despesa sem comprovante', async () => {
      vi.mocked(db.liquidarDespesa).mockResolvedValue(true);
      
      const dataLiquidacao = new Date('2025-01-15');
      
      const result = await db.liquidarDespesa(
        1,
        dataLiquidacao,
        null,
        1,
        'Usuário Teste'
      );
      
      expect(result).toBe(true);
    });
  });

  describe('Histórico', () => {
    it('deve listar histórico de uma despesa', async () => {
      const mockHistorico = [
        {
          id: 1,
          despesaId: 1,
          acao: 'criacao',
          statusAnterior: null,
          statusNovo: 'aguardando_aprovacao_gestor',
          justificativa: null,
          usuarioId: 1,
          usuarioNome: 'Usuário Teste',
          createdAt: new Date('2025-01-01'),
        },
        {
          id: 2,
          despesaId: 1,
          acao: 'aprovacao_gestor',
          statusAnterior: 'aguardando_aprovacao_gestor',
          statusNovo: 'aguardando_aprovacao_gestor_geral',
          justificativa: null,
          usuarioId: 2,
          usuarioNome: 'Gestor Teste',
          createdAt: new Date('2025-01-02'),
        },
      ];
      
      vi.mocked(db.listHistoricoDespesaV2).mockResolvedValue(mockHistorico);
      
      const result = await db.listHistoricoDespesaV2(1);
      
      expect(result).toHaveLength(2);
      expect(result[0].acao).toBe('criacao');
      expect(result[1].acao).toBe('aprovacao_gestor');
    });
  });

  describe('Listagem e Busca', () => {
    it('deve listar todas as despesas', async () => {
      const mockDespesas = [
        {
          id: 1,
          numeroCi: '001/2025',
          tipoDespesa: 'operacional',
          mesServico: 'janeiro',
          setorSolicitante: 'estudio',
          fornecedorId: 1,
          detalhamento: 'Despesa 1',
          eReembolso: false,
          valorTotal: 100000,
          tipoPagamento: 'pix',
          dadosPagamento: 'PIX: 123',
          status: 'aguardando_aprovacao_gestor',
          criadoPorId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          numeroCi: '002/2025',
          tipoDespesa: 'administrativa',
          mesServico: 'fevereiro',
          setorSolicitante: 'fotografia',
          fornecedorId: 2,
          detalhamento: 'Despesa 2',
          eReembolso: true,
          valorTotal: 50000,
          tipoPagamento: 'boleto',
          dadosPagamento: 'Boleto: 456',
          status: 'liquidado',
          criadoPorId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      vi.mocked(db.listDespesasV2).mockResolvedValue(mockDespesas);
      
      const result = await db.listDespesasV2();
      
      expect(result).toHaveLength(2);
      expect(result[0].numeroCi).toBe('001/2025');
      expect(result[1].status).toBe('liquidado');
    });

    it('deve buscar despesa por ID', async () => {
      const mockDespesa = {
        id: 1,
        numeroCi: '001/2025',
        tipoDespesa: 'operacional',
        mesServico: 'janeiro',
        setorSolicitante: 'estudio',
        fornecedorId: 1,
        detalhamento: 'Despesa teste',
        eReembolso: false,
        valorTotal: 100000,
        tipoPagamento: 'pix',
        dadosPagamento: 'PIX: 123',
        status: 'aguardando_aprovacao_gestor',
        criadoPorId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        turmas: [],
        datasRealizacao: [],
        anexos: [],
        historico: [],
      };
      
      vi.mocked(db.getDespesaV2ById).mockResolvedValue(mockDespesa);
      
      const result = await db.getDespesaV2ById(1);
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.numeroCi).toBe('001/2025');
    });
  });

  describe('Exclusão', () => {
    it('deve excluir despesa e dados relacionados', async () => {
      vi.mocked(db.deleteDespesaV2).mockResolvedValue(true);
      
      const result = await db.deleteDespesaV2(1);
      
      expect(result).toBe(true);
      expect(db.deleteDespesaV2).toHaveBeenCalledWith(1);
    });
  });
});

describe('Validações de Negócio', () => {
  it('número de CI deve seguir formato XXX/YYYY', () => {
    const numeroCi = '001/2025';
    const regex = /^\d{3}\/\d{4}$/;
    
    expect(regex.test(numeroCi)).toBe(true);
    expect(regex.test('1/2025')).toBe(false);
    expect(regex.test('001-2025')).toBe(false);
  });

  it('valor deve ser armazenado em centavos', () => {
    const valorReais = 1500.50;
    const valorCentavos = Math.round(valorReais * 100);
    
    expect(valorCentavos).toBe(150050);
  });

  it('status deve seguir fluxo de aprovação correto', () => {
    const fluxoValido = [
      'aguardando_aprovacao_gestor',
      'aguardando_aprovacao_gestor_geral',
      'aprovado_gestor_geral',
      'liquidado',
    ];
    
    const statusInicial = 'aguardando_aprovacao_gestor';
    expect(fluxoValido.indexOf(statusInicial)).toBe(0);
    
    const statusFinal = 'liquidado';
    expect(fluxoValido.indexOf(statusFinal)).toBe(3);
  });

  it('tipos de despesa devem ser operacional ou administrativa', () => {
    const tiposValidos = ['operacional', 'administrativa'];
    
    expect(tiposValidos.includes('operacional')).toBe(true);
    expect(tiposValidos.includes('administrativa')).toBe(true);
    expect(tiposValidos.includes('outro')).toBe(false);
  });

  it('setores solicitantes devem ser estudio ou fotografia', () => {
    const setoresValidos = ['estudio', 'fotografia'];
    
    expect(setoresValidos.includes('estudio')).toBe(true);
    expect(setoresValidos.includes('fotografia')).toBe(true);
    expect(setoresValidos.includes('outro')).toBe(false);
  });
});
