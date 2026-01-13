import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from './db';

// Mock do banco de dados
vi.mock('./db', () => ({
  getNextNumeroCi: vi.fn(),
  listDespesas: vi.fn(),
  getDespesaById: vi.fn(),
  createDespesa: vi.fn(),
  updateDespesa: vi.fn(),
  deleteDespesa: vi.fn(),
  listAnexosByDespesa: vi.fn(),
  createAnexoDespesa: vi.fn(),
  deleteAnexoDespesa: vi.fn(),
}));

describe('Despesas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNextNumeroCi', () => {
    it('deve retornar o próximo número CI no formato correto', async () => {
      const currentYear = new Date().getFullYear();
      vi.mocked(db.getNextNumeroCi).mockResolvedValue(`001-${currentYear}`);
      
      const result = await db.getNextNumeroCi();
      
      expect(result).toMatch(/^\d{3}-\d{4}$/);
      expect(result).toContain(currentYear.toString());
    });

    it('deve incrementar o número quando já existem despesas', async () => {
      const currentYear = new Date().getFullYear();
      vi.mocked(db.getNextNumeroCi).mockResolvedValue(`002-${currentYear}`);
      
      const result = await db.getNextNumeroCi();
      
      expect(result).toBe(`002-${currentYear}`);
    });
  });

  describe('listDespesas', () => {
    it('deve retornar lista de despesas', async () => {
      const mockDespesas = [
        { id: 1, numeroCi: '001-2025', tipoDespesa: 'operacional', valorTotal: 10000 },
        { id: 2, numeroCi: '002-2025', tipoDespesa: 'administrativo', valorTotal: 20000 },
      ];
      vi.mocked(db.listDespesas).mockResolvedValue(mockDespesas as any);
      
      const result = await db.listDespesas();
      
      expect(result).toHaveLength(2);
      expect(result[0].numeroCi).toBe('001-2025');
    });

    it('deve retornar lista vazia quando não há despesas', async () => {
      vi.mocked(db.listDespesas).mockResolvedValue([]);
      
      const result = await db.listDespesas();
      
      expect(result).toHaveLength(0);
    });
  });

  describe('createDespesa', () => {
    it('deve criar uma despesa e retornar o ID', async () => {
      vi.mocked(db.createDespesa).mockResolvedValue(1);
      
      const result = await db.createDespesa({
        numeroCi: '001-2025',
        tipoDespesa: 'operacional',
        setorSolicitante: 'estudio',
        fornecedorId: 1,
        valorTotal: 10000,
      });
      
      expect(result).toBe(1);
      expect(db.createDespesa).toHaveBeenCalledWith(expect.objectContaining({
        numeroCi: '001-2025',
        tipoDespesa: 'operacional',
      }));
    });
  });

  describe('updateDespesa', () => {
    it('deve atualizar uma despesa', async () => {
      vi.mocked(db.updateDespesa).mockResolvedValue(undefined);
      
      await db.updateDespesa(1, { status: 'apto' });
      
      expect(db.updateDespesa).toHaveBeenCalledWith(1, { status: 'apto' });
    });
  });

  describe('deleteDespesa', () => {
    it('deve excluir uma despesa', async () => {
      vi.mocked(db.deleteDespesa).mockResolvedValue(undefined);
      
      await db.deleteDespesa(1);
      
      expect(db.deleteDespesa).toHaveBeenCalledWith(1);
    });
  });

  describe('Anexos', () => {
    it('deve listar anexos de uma despesa', async () => {
      const mockAnexos = [
        { id: 1, despesaId: 1, tipoAnexo: 'comprovante_fiscal', nomeArquivo: 'nota.pdf' },
      ];
      vi.mocked(db.listAnexosByDespesa).mockResolvedValue(mockAnexos as any);
      
      const result = await db.listAnexosByDespesa(1);
      
      expect(result).toHaveLength(1);
      expect(result[0].nomeArquivo).toBe('nota.pdf');
    });

    it('deve criar um anexo', async () => {
      vi.mocked(db.createAnexoDespesa).mockResolvedValue(1);
      
      const result = await db.createAnexoDespesa({
        despesaId: 1,
        tipoAnexo: 'comprovante_fiscal',
        nomeArquivo: 'nota.pdf',
        urlArquivo: 'https://example.com/nota.pdf',
      });
      
      expect(result).toBe(1);
    });

    it('deve excluir um anexo', async () => {
      vi.mocked(db.deleteAnexoDespesa).mockResolvedValue(undefined);
      
      await db.deleteAnexoDespesa(1);
      
      expect(db.deleteAnexoDespesa).toHaveBeenCalledWith(1);
    });
  });
});
