import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

describe('Config Maquiagem Turma - Validações e Edição em Massa', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testTurmaId: number;
  let configId1: number;
  let configId2: number;
  let configId3: number;

  beforeAll(async () => {
    // Criar caller autenticado como admin
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: 'test-admin',
        name: 'Test Admin',
        email: 'admin@test.com',
        role: 'admin',
        loginMethod: 'manus',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as any,
      res: {} as any,
    };
    caller = appRouter.createCaller(ctx);

    // Criar turma de teste
    const turmaResult = await caller.turmas.create({
      codigo: 'TEST-MAQ-001',
      cursos: ['TESTE'],
      instituicoes: ['TESTE'],
      numeroTurma: '999',
      anos: [2025],
      periodos: ['1'],
      cidade: 'Recife',
      estado: 'PE',
    });
    testTurmaId = turmaResult.id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    if (configId1) await caller.configMaquiagemTurma.delete({ id: configId1 }).catch(() => {});
    if (configId2) await caller.configMaquiagemTurma.delete({ id: configId2 }).catch(() => {});
    if (configId3) await caller.configMaquiagemTurma.delete({ id: configId3 }).catch(() => {});
    if (testTurmaId) await caller.turmas.delete({ id: testTurmaId }).catch(() => {});
  });

  describe('Validação de Turma Duplicada', () => {
    it('deve permitir criar primeira configuração para uma turma', async () => {
      const result = await caller.configMaquiagemTurma.create({
        turmaId: testTurmaId,
        valorMasculino: 2000, // R$ 20,00
        valorFeminino: 3500, // R$ 35,00
        semServicoFormando: false,
        semServicoFamilia: false,
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      configId1 = result.id;
    });

    it('deve impedir criar configuração duplicada para a mesma turma', async () => {
      await expect(
        caller.configMaquiagemTurma.create({
          turmaId: testTurmaId,
          valorMasculino: 2500,
          valorFeminino: 4000,
          semServicoFormando: false,
          semServicoFamilia: false,
        })
      ).rejects.toThrow('Já existe uma configuração de maquiagem cadastrada para esta turma');
    });

    it('deve retornar a configuração existente ao buscar por turma', async () => {
      const config = await caller.configMaquiagemTurma.getByTurma({ turmaId: testTurmaId });
      
      expect(config).toBeDefined();
      expect(config?.turmaId).toBe(testTurmaId);
      expect(config?.valorMasculino).toBe(2000);
      expect(config?.valorFeminino).toBe(3500);
    });
  });

  describe('Edição em Massa', () => {
    beforeAll(async () => {
      // Criar mais duas turmas e configurações para teste de edição em massa
      const turma2 = await caller.turmas.create({
        codigo: 'TEST-MAQ-002',
        cursos: ['TESTE'],
        instituicoes: ['TESTE'],
        numeroTurma: '998',
        anos: [2025],
        periodos: ['1'],
        cidade: 'Recife',
        estado: 'PE',
      });

      const turma3 = await caller.turmas.create({
        codigo: 'TEST-MAQ-003',
        cursos: ['TESTE'],
        instituicoes: ['TESTE'],
        numeroTurma: '997',
        anos: [2025],
        periodos: ['1'],
        cidade: 'Recife',
        estado: 'PE',
      });

      const config2 = await caller.configMaquiagemTurma.create({
        turmaId: turma2.id,
        valorMasculino: 1800,
        valorFeminino: 3000,
        semServicoFormando: false,
        semServicoFamilia: false,
      });
      configId2 = config2.id;

      const config3 = await caller.configMaquiagemTurma.create({
        turmaId: turma3.id,
        valorMasculino: 1900,
        valorFeminino: 3200,
        semServicoFormando: false,
        semServicoFamilia: false,
      });
      configId3 = config3.id;
    });

    it('deve atualizar múltiplas configurações com novos valores', async () => {
      const result = await caller.configMaquiagemTurma.updateMultiple({
        ids: [configId2, configId3],
        valorMasculino: 2200, // R$ 22,00
        valorFeminino: 3800, // R$ 38,00
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
    });

    it('deve verificar se os valores foram atualizados corretamente', async () => {
      const configs = await caller.configMaquiagemTurma.list();
      
      const config2Updated = configs.find((c: any) => c.id === configId2);
      const config3Updated = configs.find((c: any) => c.id === configId3);

      expect(config2Updated?.valorMasculino).toBe(2200);
      expect(config2Updated?.valorFeminino).toBe(3800);
      expect(config3Updated?.valorMasculino).toBe(2200);
      expect(config3Updated?.valorFeminino).toBe(3800);
    });

    it('deve permitir atualizar apenas valor masculino em massa', async () => {
      const result = await caller.configMaquiagemTurma.updateMultiple({
        ids: [configId2, configId3],
        valorMasculino: 2500,
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);

      const configs = await caller.configMaquiagemTurma.list();
      const config2Updated = configs.find((c: any) => c.id === configId2);
      
      expect(config2Updated?.valorMasculino).toBe(2500);
      expect(config2Updated?.valorFeminino).toBe(3800); // Mantém valor anterior
    });

    it('deve permitir atualizar apenas valor feminino em massa', async () => {
      const result = await caller.configMaquiagemTurma.updateMultiple({
        ids: [configId2, configId3],
        valorFeminino: 4200,
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);

      const configs = await caller.configMaquiagemTurma.list();
      const config2Updated = configs.find((c: any) => c.id === configId2);
      
      expect(config2Updated?.valorMasculino).toBe(2500); // Mantém valor anterior
      expect(config2Updated?.valorFeminino).toBe(4200);
    });

    it('deve atualizar apenas as configurações selecionadas', async () => {
      await caller.configMaquiagemTurma.updateMultiple({
        ids: [configId2], // Apenas config2
        valorMasculino: 3000,
        valorFeminino: 5000,
      });

      const configs = await caller.configMaquiagemTurma.list();
      const config2Updated = configs.find((c: any) => c.id === configId2);
      const config3Updated = configs.find((c: any) => c.id === configId3);

      expect(config2Updated?.valorMasculino).toBe(3000);
      expect(config2Updated?.valorFeminino).toBe(5000);
      
      // Config3 não deve ter sido alterado
      expect(config3Updated?.valorMasculino).toBe(2500);
      expect(config3Updated?.valorFeminino).toBe(4200);
    });
  });
});
