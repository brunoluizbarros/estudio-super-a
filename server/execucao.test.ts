import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';

describe('Execução - Salvamento de Fotos', () => {
  let testEventoId: number | undefined;
  let testFormandoId: number | undefined;
  let testTurmaId: number | undefined;
  let skipTests = false;

  beforeAll(async () => {
    // Buscar uma turma existente para teste que tenha formandos
    const turmas = await db.getAllTurmas();
    if (turmas.length === 0) {
      console.warn('Nenhuma turma encontrada para teste - pulando testes');
      skipTests = true;
      return;
    }
    
    // Procurar uma turma que tenha formandos
    for (const turma of turmas) {
      const formandos = await db.getFormandosByTurma(turma.id);
      if (formandos.length > 0) {
        testTurmaId = turma.id;
        testFormandoId = formandos[0].id;
        break;
      }
    }
    
    if (!testFormandoId) {
      console.warn('Nenhum formando encontrado para teste - pulando testes');
      skipTests = true;
      return;
    }

    // Buscar eventos da turma
    const eventos = await db.getEventosByTurma(testTurmaId!);
    if (eventos.length === 0) {
      console.warn('Nenhum evento encontrado para teste - pulando testes');
      skipTests = true;
      return;
    }
    testEventoId = eventos[0].id;
  });

  it('deve criar uma execução para o formando', async () => {
    if (skipTests || !testEventoId || !testFormandoId) {
      console.log('Teste pulado - dados de teste não disponíveis');
      return;
    }
    
    const caller = appRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: {
        id: 1,
        openId: 'test',
        name: 'Test User',
        email: 'test@test.com',
        role: 'administrador',
        status: 'aprovado',
        loginMethod: 'email',
        tipoUsuarioId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    const resultado = await caller.execucaoFormando.upsert({
      eventoId: testEventoId,
      formandoId: testFormandoId,
      dataExecucao: new Date(),
      observacoes: 'Teste de execução',
    });

    expect(resultado).toHaveProperty('success', true);
    expect(resultado).toHaveProperty('id');
    expect(typeof resultado.id).toBe('number');
  });

  it('deve retornar um objeto com id ao criar execução', async () => {
    if (skipTests || !testEventoId || !testFormandoId) {
      console.log('Teste pulado - dados de teste não disponíveis');
      return;
    }
    
    const caller = appRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: {
        id: 1,
        openId: 'test',
        name: 'Test User',
        email: 'test@test.com',
        role: 'administrador',
        status: 'aprovado',
        loginMethod: 'email',
        tipoUsuarioId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    const resultado = await caller.execucaoFormando.upsert({
      eventoId: testEventoId,
      formandoId: testFormandoId,
    });

    // Verificar que o resultado tem a estrutura esperada
    expect(resultado).toBeDefined();
    expect(resultado.id).toBeDefined();
    expect(typeof resultado.id).toBe('number');
    expect(resultado.id).toBeGreaterThan(0);
  });

  it('deve listar execuções por evento', async () => {
    if (skipTests || !testEventoId) {
      console.log('Teste pulado - dados de teste não disponíveis');
      return;
    }
    
    const caller = appRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: {
        id: 1,
        openId: 'test',
        name: 'Test User',
        email: 'test@test.com',
        role: 'administrador',
        status: 'aprovado',
        loginMethod: 'email',
        tipoUsuarioId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    const execucoes = await caller.execucaoFormando.listByEvento({
      eventoId: testEventoId,
    });

    expect(Array.isArray(execucoes)).toBe(true);
  });
});
