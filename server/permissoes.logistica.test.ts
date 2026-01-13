import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import type { Context } from './_core/context';

describe('Permissões de Configurações - Logística', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let tipoUsuarioLogisticaId: number;

  beforeAll(async () => {
    // Criar contexto de teste como admin
    const ctx: Context = {
      user: {
        id: 1,
        openId: 'test-admin',
        name: 'Admin Test',
        email: 'admin@test.com',
        role: 'administrador',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    caller = appRouter.createCaller(ctx);

    // Buscar o tipo de usuário Logística
    const tiposUsuario = await caller.tiposUsuario.list();
    const logistica = tiposUsuario.find((t: any) => 
      t.nome.toLowerCase().includes('logística') || 
      t.nome.toLowerCase().includes('logistica')
    );
    
    if (!logistica) {
      throw new Error('Tipo de usuário Logística não encontrado no banco de dados');
    }
    
    tipoUsuarioLogisticaId = logistica.id;
  });

  it('deve salvar permissão de visualizar Instituições para Logística', async () => {
    const result = await caller.permissoesConfiguracoes.upsert({
      role: 'logistica',
      aba: 'instituicoes',
      visualizar: true,
      inserir: false,
      excluir: false
    });

    expect(result.success).toBe(true);
  });

  it('deve recuperar permissão salva de Instituições para Logística', async () => {
    const permissoes = await caller.permissoesConfiguracoes.list();
    
    const permissaoLogistica = permissoes.find((p: any) => 
      p.tipoUsuarioId === tipoUsuarioLogisticaId && 
      p.aba === 'instituicoes'
    );

    expect(permissaoLogistica).toBeDefined();
    expect(permissaoLogistica?.visualizar).toBe(true);
    expect(permissaoLogistica?.inserir).toBe(false);
    expect(permissaoLogistica?.excluir).toBe(false);
  });

  it('deve atualizar permissão existente de Instituições para Logística', async () => {
    // Atualizar para incluir inserir
    const result = await caller.permissoesConfiguracoes.upsert({
      role: 'logistica',
      aba: 'instituicoes',
      visualizar: true,
      inserir: true,
      excluir: false
    });

    expect(result.success).toBe(true);

    // Verificar atualização
    const permissoes = await caller.permissoesConfiguracoes.list();
    const permissaoLogistica = permissoes.find((p: any) => 
      p.tipoUsuarioId === tipoUsuarioLogisticaId && 
      p.aba === 'instituicoes'
    );

    expect(permissaoLogistica?.visualizar).toBe(true);
    expect(permissaoLogistica?.inserir).toBe(true);
    expect(permissaoLogistica?.excluir).toBe(false);
  });

  it('deve salvar múltiplas permissões para Logística', async () => {
    const abas = ['cursos', 'cidades', 'locais'];
    
    for (const aba of abas) {
      const result = await caller.permissoesConfiguracoes.upsert({
        role: 'logistica',
        aba,
        visualizar: true,
        inserir: false,
        excluir: false
      });
      
      expect(result.success).toBe(true);
    }

    // Verificar todas as permissões salvas
    const permissoes = await caller.permissoesConfiguracoes.list();
    const permissoesLogistica = permissoes.filter((p: any) => 
      p.tipoUsuarioId === tipoUsuarioLogisticaId
    );

    expect(permissoesLogistica.length).toBeGreaterThanOrEqual(abas.length);
  });

  it('deve normalizar corretamente o slug do tipo de usuário', async () => {
    // Testar com diferentes variações do nome
    const variacoes = ['logistica', 'Logistica', 'LOGISTICA', 'Logística'];
    
    for (const variacao of variacoes) {
      const result = await caller.permissoesConfiguracoes.upsert({
        role: variacao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
        aba: 'tipos_evento',
        visualizar: true,
        inserir: false,
        excluir: false
      });
      
      expect(result.success).toBe(true);
    }
  });
});
