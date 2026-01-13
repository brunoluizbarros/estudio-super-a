import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { getDb } from './db';

describe('Vendas - CV/NSU e Data Compensação', () => {
  let turmaId: number;
  let eventoId: number;
  let formandoId: number;
  let vendaId: number;

  beforeAll(async () => {
    // Criar turma de teste com código único
    const timestamp = Date.now();
    turmaId = await db.createTurma({
      codigo: `TEST-${timestamp}`,
      cursos: JSON.stringify(['TESTE']),
      instituicoes: JSON.stringify(['TESTE']),
      numeroTurma: '1',
      anos: JSON.stringify([2026]),
      periodos: JSON.stringify(['1']),
      cidade: 'Recife',
      estado: 'PE',
    });

    // Criar evento de teste
    eventoId = await db.createEvento({
      turmaId,
      tipoEvento: 'foto_estudio',
      dataEvento: new Date('2026-01-15'),
      status: 'agendado',
    });

    // Criar formando de teste
    formandoId = await db.createFormando({
      turmaId,
      codigoFormando: 'F001',
      nome: 'Teste CV/NSU',
      status: 'apto',
    });
  });

  afterAll(async () => {
    // Limpar dados de teste
    const dbConn = await getDb();
    if (dbConn && vendaId) {
      await dbConn.execute(`DELETE FROM pagamentos WHERE vendaId = ${vendaId}`);
      await dbConn.execute(`DELETE FROM itensVenda WHERE vendaId = ${vendaId}`);
      await dbConn.execute(`DELETE FROM vendas WHERE id = ${vendaId}`);
    }
    if (dbConn && formandoId) {
      await dbConn.execute(`DELETE FROM formandos WHERE id = ${formandoId}`);
    }
    if (dbConn && eventoId) {
      await dbConn.execute(`DELETE FROM eventos WHERE id = ${eventoId}`);
    }
    if (dbConn && turmaId) {
      await dbConn.execute(`DELETE FROM turmas WHERE id = ${turmaId}`);
    }
  });

  it('deve criar venda com CV/NSU no pagamento', async () => {
    // Criar venda com pagamento contendo CV/NSU
    vendaId = await db.createVenda({
      eventoId,
      formandoId,
      dataVenda: new Date('2026-01-13'),
      valorTotal: 65000, // R$ 650,00
      valorLiquido: 61776, // Após taxas
      status: 'pago',
      fase: 'Execução',
      createdBy: 1,
    });

    // Criar item de venda
    await db.createItemVenda({
      vendaId,
      produtoId: 1,
      produto: 'Todas as Fotos',
      categoria: 'Foto',
      quantidade: 1,
      valorUnitario: 65000,
      ajusteValor: 0,
      valorTotal: 65000,
    });

    // Criar pagamento com CV/NSU
    const pagamentoId = await db.createPagamento({
      vendaId,
      tipo: 'credito',
      valor: 65000,
      valorLiquido: 61776,
      bandeira: 'MASTER',
      parcelas: 4,
      cvNsu: '27410510', // CV/NSU de teste
      dataCompensacao: new Date('2026-01-15'), // 2 dias úteis após 13/01
    });

    // Buscar pagamento criado
    const pagamentos = await db.getPagamentosByVenda(vendaId);
    
    expect(pagamentos).toHaveLength(1);
    expect(pagamentos[0].cvNsu).toBe('27410510');
    expect(pagamentos[0].dataCompensacao).toBeTruthy();
  });

  it('deve manter CV/NSU ao editar venda', async () => {
    // Deletar pagamentos antigos
    await db.deletePagamentosByVenda(vendaId);
    
    // Criar novo pagamento com CV/NSU diferente (simulando edição)
    await db.createPagamento({
      vendaId,
      tipo: 'credito',
      valor: 65000,
      valorLiquido: 61776,
      bandeira: 'MASTER',
      parcelas: 4,
      cvNsu: '99999999', // Novo CV/NSU
      dataCompensacao: new Date('2026-01-15'),
    });

    // Buscar pagamento atualizado
    const pagamentos = await db.getPagamentosByVenda(vendaId);
    
    expect(pagamentos).toHaveLength(1);
    expect(pagamentos[0].cvNsu).toBe('99999999');
  });

  it('deve retornar pagamentos com CV/NSU ao buscar vendas do formando', async () => {
    const vendas = await db.getVendasByFormando(formandoId);
    
    expect(vendas).toHaveLength(1);
    expect(vendas[0].id).toBe(vendaId);
    
    // Buscar pagamentos da venda
    const pagamentos = await db.getPagamentosByVenda(vendas[0].id);
    
    expect(pagamentos).toHaveLength(1);
    expect(pagamentos[0].cvNsu).toBe('99999999');
    expect(pagamentos[0].dataCompensacao).toBeTruthy();
  });
});
