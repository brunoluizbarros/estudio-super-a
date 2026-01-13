import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as db from './db';

describe('Execução - Salvamento de Fotos e Serviços', () => {
  let turmaId: number;
  let eventoId: number;
  let formandoId: number;

  beforeEach(async () => {
    // Criar turma de teste
    turmaId = await db.createTurma({
      codigo: 'TEST-EXEC-001',
      cursos: JSON.stringify(['TESTE']),
      instituicoes: JSON.stringify(['TESTE']),
      numeroTurma: '1',
      anos: JSON.stringify([2026]),
      periodos: JSON.stringify(['1']),
      cidade: 'Recife',
      estado: 'PE',
    });

    // Criar formando de teste
    formandoId = await db.createFormando({
      turmaId,
      codigoFormando: 'FORM-001',
      nome: 'Teste Formando',
      cpf: '123.456.789-00',
      telefone: '(81) 99999-9999',
      email: 'teste@example.com',
      genero: 'masculino',
      status: 'apto',
      comissao: false,
    });

    // Criar evento de teste
    eventoId = await db.createEvento({
      turmaId,
      tipoEvento: 'foto_estudio',
      dataInicio: new Date('2026-01-15'),
      dataFim: new Date('2026-01-15'),
      localId: null,
      cenarios: JSON.stringify([]),
      fotografos: JSON.stringify([]),
    });
  });

  afterEach(async () => {
    // Limpar dados de teste
    if (formandoId) {
      await db.deleteFormando(formandoId);
    }
    if (eventoId) {
      await db.deleteEvento(eventoId);
    }
    if (turmaId) {
      await db.deleteTurma(turmaId);
    }
  });

  it('deve criar execução e retornar ID válido', async () => {
    const resultado = await db.upsertExecucaoFormando({
      eventoId,
      formandoId,
      dataExecucao: new Date('2026-01-15'),
      observacoes: 'Teste de execução',
    });

    expect(resultado).toBeDefined();
    expect(typeof resultado).toBe('number');
    expect(resultado).toBeGreaterThan(0);
  });

  it('deve permitir salvar fotos após criar execução', async () => {
    // Criar execução
    const execucaoId = await db.upsertExecucaoFormando({
      eventoId,
      formandoId,
      dataExecucao: new Date('2026-01-15'),
    });

    expect(execucaoId).toBeGreaterThan(0);

    // Criar cenário de teste
    const cenarioId = await db.createCenario({
      nome: 'Cenário Teste',
      descricao: 'Cenário para teste',
    });

    // Salvar foto
    const fotoId = await db.createFotoFormando({
      execucaoFormandoId: execucaoId,
      cenarioId,
      numeroArquivos: 10,
      observacao: 'Teste de foto',
      dataExecucao: new Date('2026-01-15'),
    });

    expect(fotoId).toBeGreaterThan(0);

    // Verificar se a foto foi salva
    const fotos = await db.listFotosFormando(execucaoId);
    expect(fotos).toHaveLength(1);
    expect(fotos[0].cenarioId).toBe(cenarioId);
    expect(fotos[0].numeroArquivos).toBe(10);

    // Limpar
    await db.deleteFotoFormando(fotoId);
    await db.deleteCenario(cenarioId);
  });

  it('deve retornar objeto com propriedade id ao criar execução', async () => {
    const resultado = await db.upsertExecucaoFormando({
      eventoId,
      formandoId,
      dataExecucao: new Date('2026-01-15'),
    });

    // Verificar que resultado é um número (ID)
    expect(typeof resultado).toBe('number');
    
    // Verificar que podemos usar o ID retornado
    const execucaoId = resultado;
    expect(execucaoId).toBeGreaterThan(0);

    // Verificar que a execução foi criada
    const execucao = await db.getExecucaoFormando(eventoId, formandoId);
    expect(execucao).toBeDefined();
    expect(execucao?.id).toBe(execucaoId);
  });
});
