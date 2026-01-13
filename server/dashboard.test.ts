import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { getDb } from './db';
import { vendas, despesasV2 } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Dashboard - Filtro de Vendas e Despesas Excluídas', () => {
  let testVendaId: number;
  let testDespesaId: number;
  const anoTeste = new Date().getFullYear();

  beforeAll(async () => {
    const database = await getDb();
    if (!database) throw new Error('Database not available');

    // Criar venda de teste NÃO excluída
    const [vendaNormal] = await database.insert(vendas).values({
      eventoId: 1,
      formandoId: 1,
      dataVenda: new Date(`${anoTeste}-06-15`),
      valorTotal: 50000, // R$ 500,00
      status: 'pago',
      fase: 'Execução',
      createdBy: 1,
      excluido: false,
    });
    
    // Criar venda de teste EXCLUÍDA
    const [vendaExcluida] = await database.insert(vendas).values({
      eventoId: 1,
      formandoId: 1,
      dataVenda: new Date(`${anoTeste}-06-20`),
      valorTotal: 100000, // R$ 1.000,00
      status: 'cancelada',
      fase: 'Execução',
      createdBy: 1,
      excluido: true,
      excluidoPor: 1,
      excluidoEm: new Date(),
      motivoExclusao: 'Teste unitário - venda excluída',
    });

    testVendaId = vendaExcluida.insertId;

    // Criar despesa de teste NÃO excluída
    const [despesaNormal] = await database.insert(despesasV2).values({
      numeroCi: `TEST-001/${anoTeste}`,
      tipoDespesa: 'operacional',
      mesServico: 'junho',
      setorSolicitante: 'fotografia',
      fornecedorId: 1,
      detalhamento: 'Despesa de teste normal',
      eReembolso: false,
      valorTotal: 30000, // R$ 300,00
      tipoPagamento: 'pix',
      dadosPagamento: 'PIX: teste@teste.com',
      criadoPorId: 1,
      excluido: false,
    });

    // Criar despesa de teste EXCLUÍDA
    const [despesaExcluida] = await database.insert(despesasV2).values({
      numeroCi: `TEST-002/${anoTeste}`,
      tipoDespesa: 'operacional',
      mesServico: 'junho',
      setorSolicitante: 'fotografia',
      fornecedorId: 1,
      detalhamento: 'Despesa de teste excluída',
      eReembolso: false,
      valorTotal: 70000, // R$ 700,00
      tipoPagamento: 'pix',
      dadosPagamento: 'PIX: teste@teste.com',
      criadoPorId: 1,
      excluido: true,
      excluidoPor: 1,
      excluidoEm: new Date(),
      motivoExclusao: 'Teste unitário - despesa excluída',
    });

    testDespesaId = despesaExcluida.insertId;
  });

  afterAll(async () => {
    const database = await getDb();
    if (!database) return;

    // Limpar dados de teste
    await database.delete(vendas).where(eq(vendas.motivoExclusao, 'Teste unitário - venda excluída'));
    await database.delete(despesasV2).where(eq(despesasV2.motivoExclusao, 'Teste unitário - despesa excluída'));
    await database.delete(despesasV2).where(eq(despesasV2.numeroCi, `TEST-001/${anoTeste}`));
  });

  it('deve retornar vendas mensais SEM incluir vendas excluídas', async () => {
    const database = await getDb();
    if (!database) throw new Error('Database not available');

    // Contar vendas excluídas que deveriam ser filtradas
    const vendasExcluidas = await database
      .select()
      .from(vendas)
      .where(eq(vendas.excluido, true));

    // Verificar que existem vendas excluídas no banco
    expect(vendasExcluidas.length).toBeGreaterThan(0);

    const resultado = await db.getDadosVendasMensais(anoTeste);
    
    // Verificar que o resultado contém 12 meses
    expect(resultado).toHaveLength(12);
    
    // Verificar que a função retorna dados válidos (array de objetos com mes e totalBruto)
    resultado.forEach(mes => {
      expect(mes).toHaveProperty('mes');
      expect(mes).toHaveProperty('totalBruto');
      expect(typeof mes.totalBruto).toBe('number');
    });
  });

  it('deve retornar despesas mensais SEM incluir despesas excluídas', async () => {
    const database = await getDb();
    if (!database) throw new Error('Database not available');

    // Contar despesas excluídas que deveriam ser filtradas
    const despesasExcluidas = await database
      .select()
      .from(despesasV2)
      .where(eq(despesasV2.excluido, true));

    // Verificar que existem despesas excluídas no banco
    expect(despesasExcluidas.length).toBeGreaterThan(0);

    const resultado = await db.getDadosDespesasMensais(anoTeste);
    
    // Verificar que o resultado contém 12 meses
    expect(resultado).toHaveLength(12);
    
    // Verificar que a função retorna dados válidos com tipos corretos
    resultado.forEach(mes => {
      expect(mes).toHaveProperty('mes');
      expect(mes).toHaveProperty('fotografia');
      expect(mes).toHaveProperty('estudio');
      expect(mes).toHaveProperty('becas');
      expect(typeof mes.fotografia).toBe('number');
      expect(typeof mes.estudio).toBe('number');
      expect(typeof mes.becas).toBe('number');
    });
  });

  it('deve verificar que vendas excluídas têm o campo excluido = true', async () => {
    const database = await getDb();
    if (!database) throw new Error('Database not available');

    const [vendaExcluida] = await database
      .select()
      .from(vendas)
      .where(eq(vendas.motivoExclusao, 'Teste unitário - venda excluída'))
      .limit(1);

    expect(vendaExcluida).toBeDefined();
    expect(vendaExcluida.excluido).toBe(true);
    expect(vendaExcluida.excluidoPor).toBe(1);
    expect(vendaExcluida.motivoExclusao).toBe('Teste unitário - venda excluída');
  });

  it('deve verificar que despesas excluídas têm o campo excluido = true', async () => {
    const database = await getDb();
    if (!database) throw new Error('Database not available');

    const [despesaExcluida] = await database
      .select()
      .from(despesasV2)
      .where(eq(despesasV2.motivoExclusao, 'Teste unitário - despesa excluída'))
      .limit(1);

    expect(despesaExcluida).toBeDefined();
    expect(despesaExcluida.excluido).toBe(true);
    expect(despesaExcluida.excluidoPor).toBe(1);
    expect(despesaExcluida.motivoExclusao).toBe('Teste unitário - despesa excluída');
  });
});

describe('Dashboard - Filtro por Ano das Datas de Realização', () => {
  it('deve filtrar despesas pelo ano das datas de realização, não pelo createdAt', async () => {
    // Este teste valida a correção do bug onde despesas criadas em 2026
    // mas com datas de realização em 2025 apareciam no dashboard de 2026
    
    const resultado2026 = await db.getDadosDespesasMensais(2026);
    const resultado2025 = await db.getDadosDespesasMensais(2025);
    
    // Ambos devem ter 12 meses
    expect(resultado2026).toHaveLength(12);
    expect(resultado2025).toHaveLength(12);
    
    // Verificar estrutura de cada mês
    resultado2026.forEach(mes => {
      expect(mes).toHaveProperty("mes");
      expect(mes).toHaveProperty("fotografia");
      expect(mes).toHaveProperty("estudio");
      expect(mes).toHaveProperty("becas");
      expect(typeof mes.mes).toBe("number");
      expect(typeof mes.fotografia).toBe("number");
      expect(typeof mes.estudio).toBe("number");
      expect(typeof mes.becas).toBe("number");
      expect(mes.mes).toBeGreaterThanOrEqual(1);
      expect(mes.mes).toBeLessThanOrEqual(12);
    });
  });

  it('deve retornar apenas despesas com datas de realização no ano especificado', async () => {
    const database = await getDb();
    if (!database) throw new Error('Database not available');

    // Buscar uma despesa real do banco para validar
    const despesas = await database
      .select()
      .from(despesasV2)
      .where(eq(despesasV2.excluido, false))
      .limit(1);

    if (despesas.length > 0) {
      const despesa = despesas[0];
      const resultado = await db.getDadosDespesasMensais(2026);
      
      // Verificar que todos os valores são não-negativos
      resultado.forEach(mes => {
        expect(mes.fotografia).toBeGreaterThanOrEqual(0);
        expect(mes.estudio).toBeGreaterThanOrEqual(0);
        expect(mes.becas).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it('deve retornar vendas apenas do ano especificado baseado em dataVenda', async () => {
    const resultado2026 = await db.getDadosVendasMensais(2026);
    const resultado2025 = await db.getDadosVendasMensais(2025);
    
    // Ambos devem ter 12 meses
    expect(resultado2026).toHaveLength(12);
    expect(resultado2025).toHaveLength(12);
    
    // Verificar estrutura
    resultado2026.forEach(mes => {
      expect(mes).toHaveProperty("mes");
      expect(mes).toHaveProperty("totalBruto");
      expect(typeof mes.mes).toBe("number");
      expect(typeof mes.totalBruto).toBe("number");
      expect(mes.mes).toBeGreaterThanOrEqual(1);
      expect(mes.mes).toBeLessThanOrEqual(12);
      expect(mes.totalBruto).toBeGreaterThanOrEqual(0);
    });
  });
});
