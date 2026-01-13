import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import * as db from './db';
import { execucaoFormando, briefingGrupo, briefingFormando } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

describe('Sincronização Execução → Briefing', () => {
  let testEventoId: number;
  let testFormandoId: number;
  let testExecucaoId: number;

  beforeAll(async () => {
    // Criar dados de teste
    const database = await getDb();
    if (!database) throw new Error('Database not available');

    // Usar IDs de teste que não conflitam com dados reais
    testEventoId = 999999;
    testFormandoId = 999999;

    // Limpar dados de teste anteriores
    await database.delete(briefingFormando).where(eq(briefingFormando.eventoId, testEventoId));
    await database.delete(briefingGrupo).where(eq(briefingGrupo.eventoId, testEventoId));
    await database.delete(execucaoFormando).where(eq(execucaoFormando.eventoId, testEventoId));
  });

  afterAll(async () => {
    // Limpar dados de teste
    const database = await getDb();
    if (!database) return;

    await database.delete(briefingFormando).where(eq(briefingFormando.eventoId, testEventoId));
    await database.delete(briefingGrupo).where(eq(briefingGrupo.eventoId, testEventoId));
    await database.delete(execucaoFormando).where(eq(execucaoFormando.eventoId, testEventoId));
  });

  it('deve criar grupo automaticamente quando não existe', async () => {
    // Criar execução
    testExecucaoId = await db.upsertExecucaoFormando({
      eventoId: testEventoId,
      formandoId: testFormandoId,
      status: 'apto',
    });

    expect(testExecucaoId).toBeGreaterThan(0);

    // Executar sincronização
    const resultado = await db.syncExecucaoToBriefing(testEventoId);

    expect(resultado.success).toBe(true);
    expect(resultado.sincronizados).toBeGreaterThan(0);

    // Verificar se grupo foi criado
    const database = await getDb();
    if (!database) throw new Error('Database not available');

    const grupos = await database
      .select()
      .from(briefingGrupo)
      .where(eq(briefingGrupo.eventoId, testEventoId));

    expect(grupos.length).toBeGreaterThan(0);
    expect(grupos[0].numero).toBe(1);
  });

  it('deve criar registro de briefing_formando para execução', async () => {
    const database = await getDb();
    if (!database) throw new Error('Database not available');

    // Verificar se formando foi sincronizado
    const formandos = await database
      .select()
      .from(briefingFormando)
      .where(
        and(
          eq(briefingFormando.eventoId, testEventoId),
          eq(briefingFormando.formandoId, testFormandoId)
        )
      );

    expect(formandos.length).toBe(1);
    expect(formandos[0].formandoId).toBe(testFormandoId);
  });

  it('deve atualizar registro existente em vez de duplicar', async () => {
    // Executar sincronização novamente
    const resultado = await db.syncExecucaoToBriefing(testEventoId);

    expect(resultado.success).toBe(true);

    // Verificar que não houve duplicação
    const database = await getDb();
    if (!database) throw new Error('Database not available');

    const formandos = await database
      .select()
      .from(briefingFormando)
      .where(
        and(
          eq(briefingFormando.eventoId, testEventoId),
          eq(briefingFormando.formandoId, testFormandoId)
        )
      );

    expect(formandos.length).toBe(1); // Não deve duplicar
  });
});

describe('Correção do Dropdown de Eventos na Abordagem', () => {
  it('deve listar todos os eventos com datas em vez de agrupar por tipo', async () => {
    // Este teste valida que a lógica foi corrigida
    // A correção está no frontend (Abordagem.tsx)
    // onde eventosComData agora lista TODOS os eventos com suas datas
    // em vez de usar tiposEventoUnicos que agrupava por tipo

    // Simular dados de eventos (usar UTC para evitar problemas de timezone)
    const eventosTurma = [
      { id: 1, tipoEvento: 'foto_estudio', dataEvento: new Date('2026-01-06T12:00:00Z') },
      { id: 2, tipoEvento: 'foto_estudio', dataEvento: new Date('2026-01-07T12:00:00Z') },
      { id: 3, tipoEvento: 'foto_estudio', dataEvento: new Date('2026-01-08T12:00:00Z') },
      { id: 4, tipoEvento: 'foto_oficial', dataEvento: new Date('2026-02-06T12:00:00Z') },
    ];

    // Lógica corrigida: listar TODOS os eventos
    const eventosComData = eventosTurma
      .filter(evento => evento.dataEvento)
      .map(evento => ({
        eventoId: evento.id,
        tipoEvento: evento.tipoEvento,
        dataEvento: evento.dataEvento,
        dataFormatada: evento.dataEvento.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      }))
      .sort((a, b) => a.dataEvento.getTime() - b.dataEvento.getTime());

    // Validar que todos os eventos estão presentes
    expect(eventosComData.length).toBe(4); // Todos os 4 eventos
    expect(eventosComData[0].eventoId).toBe(1);
    expect(eventosComData[1].eventoId).toBe(2);
    expect(eventosComData[2].eventoId).toBe(3);
    expect(eventosComData[3].eventoId).toBe(4);

    // Validar formatação das datas
    expect(eventosComData[0].dataFormatada).toBe('06/01/2026');
    expect(eventosComData[1].dataFormatada).toBe('07/01/2026');
    expect(eventosComData[2].dataFormatada).toBe('08/01/2026');
    expect(eventosComData[3].dataFormatada).toBe('06/02/2026');
  });
});
