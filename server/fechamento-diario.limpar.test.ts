import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("Fechamento Diário - Limpar Dados", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    // Mock do contexto com usuário autenticado
    ctx = {
      user: {
        id: 1,
        name: "Admin Test",
        email: "admin@test.com",
        role: "admin",
        openId: "test-open-id",
        tipoUsuarioId: null,
      },
      req: {} as any,
      res: {} as any,
    };
    caller = appRouter.createCaller(ctx);
  });

  it("deve criar um fechamento diário", async () => {
    const dataHoje = new Date().toISOString().split("T")[0];
    
    const fechamento = await caller.fechamentoDiario.buscarOuCriarFechamento({
      data: dataHoje,
    });

    expect(fechamento).toBeDefined();
    expect(fechamento?.data).toBeDefined();
  });

  it("deve limpar dados do fechamento diário", async () => {
    const dataHoje = new Date().toISOString().split("T")[0];
    
    // Primeiro, garantir que existe um fechamento
    const fechamento = await caller.fechamentoDiario.buscarOuCriarFechamento({
      data: dataHoje,
    });

    expect(fechamento).toBeDefined();

    // Limpar os dados
    const resultado = await caller.fechamentoDiario.limparDadosDia({
      data: dataHoje,
    });

    expect(resultado.success).toBe(true);

    // Verificar se o fechamento foi resetado
    const fechamentoAtualizado = await caller.fechamentoDiario.buscarOuCriarFechamento({
      data: dataHoje,
    });

    expect(fechamentoAtualizado?.totalRede).toBe(0);
    expect(fechamentoAtualizado?.quantidadeVendasOk).toBe(0);
    expect(fechamentoAtualizado?.quantidadeDivergencias).toBe(0);
    expect(fechamentoAtualizado?.quantidadeNaoLancadas).toBe(0);
    expect(fechamentoAtualizado?.quantidadeFantasma).toBe(0);
    expect(fechamentoAtualizado?.status).toBe("pendente");
  });

  it("deve retornar erro ao tentar limpar fechamento inexistente", async () => {
    const dataInvalida = "2099-12-31"; // Data futura que não tem fechamento

    await expect(
      caller.fechamentoDiario.limparDadosDia({
        data: dataInvalida,
      })
    ).rejects.toThrow("Fechamento não encontrado para esta data");
  });
});
