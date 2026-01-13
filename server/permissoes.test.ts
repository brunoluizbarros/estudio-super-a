import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";
import * as dbPermissoes from "./db_permissoes";

describe("Sistema de Permissões - Correção tipoUsuarioId", () => {
  let tipoUsuarioId: number;
  let tipoUsuarioNome: string;

  beforeAll(async () => {
    // Buscar um tipo de usuário existente para usar nos testes
    const tiposUsuario = await db.listTiposUsuario();
    expect(tiposUsuario.length).toBeGreaterThan(0);
    
    const tipoUsuario = tiposUsuario[0];
    tipoUsuarioId = tipoUsuario.id;
    tipoUsuarioNome = tipoUsuario.nome;
  });

  it("deve buscar permissões pelo nome do tipo de usuário (role)", async () => {
    // Buscar permissões usando o nome do tipo de usuário
    const permissoes = await dbPermissoes.listPermissoesByRole(tipoUsuarioNome);
    
    // Verificar que retornou um array (pode estar vazio se não houver permissões cadastradas)
    expect(Array.isArray(permissoes)).toBe(true);
    
    // Se houver permissões, todas devem ter o tipoUsuarioId correto
    if (permissoes.length > 0) {
      permissoes.forEach((permissao: any) => {
        expect(permissao.tipoUsuarioId).toBe(tipoUsuarioId);
      });
    }
  });

  it("deve retornar array vazio para tipo de usuário inexistente", async () => {
    const permissoes = await dbPermissoes.listPermissoesByRole("tipo_inexistente_xyz");
    expect(Array.isArray(permissoes)).toBe(true);
    expect(permissoes.length).toBe(0);
  });

  it("deve buscar permissões de configurações pelo tipoUsuarioId", async () => {
    const permissoesConfig = await db.getPermissoesConfiguracoesByRole(tipoUsuarioNome);
    
    // Verificar que retornou um array
    expect(Array.isArray(permissoesConfig)).toBe(true);
    
    // Se houver permissões, todas devem ter o tipoUsuarioId correto
    if (permissoesConfig.length > 0) {
      permissoesConfig.forEach((permissao: any) => {
        expect(permissao.tipoUsuarioId).toBe(tipoUsuarioId);
      });
    }
  });

  it("deve criar permissão com tipoUsuarioId correto", async () => {
    // Criar uma permissão de teste
    const secaoTeste = "teste_secao_" + Date.now();
    
    const permissaoId = await dbPermissoes.createPermissao({
      role: tipoUsuarioNome,
      secao: secaoTeste,
      visualizar: true,
      inserir: false,
      excluir: false,
      tipoUsuarioId: tipoUsuarioId,
    });

    expect(permissaoId).toBeGreaterThan(0);

    // Buscar a permissão criada
    const permissoes = await dbPermissoes.listPermissoesByRole(tipoUsuarioNome);
    const permissaoCriada = permissoes.find((p: any) => p.secao === secaoTeste);

    expect(permissaoCriada).toBeDefined();
    expect(permissaoCriada?.tipoUsuarioId).toBe(tipoUsuarioId);
    expect(permissaoCriada?.visualizar).toBe(true);
    expect(permissaoCriada?.inserir).toBe(false);
    expect(permissaoCriada?.excluir).toBe(false);

    // Limpar: deletar a permissão de teste
    if (permissaoCriada) {
      await dbPermissoes.deletePermissao(permissaoCriada.id);
    }
  });

  it("deve fazer upsert de permissão de configuração com tipoUsuarioId correto", async () => {
    // Fazer upsert de uma permissão de configuração
    const result = await db.upsertPermissaoConfiguracao({
      role: tipoUsuarioNome,
      aba: "instituicoes",
      visualizar: true,
      inserir: true,
      excluir: false,
    });

    expect(result.success).toBe(true);

    // Buscar a permissão criada/atualizada
    const permissoesConfig = await db.getPermissoesConfiguracoesByRole(tipoUsuarioNome);
    const permissaoInstituicoes = permissoesConfig.find((p: any) => p.aba === "instituicoes");

    expect(permissaoInstituicoes).toBeDefined();
    expect(permissaoInstituicoes?.tipoUsuarioId).toBe(tipoUsuarioId);
    expect(permissaoInstituicoes?.visualizar).toBe(true);
    expect(permissaoInstituicoes?.inserir).toBe(true);
    expect(permissaoInstituicoes?.excluir).toBe(false);
  });
});
