import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { createInnerTRPCContext } from "./_core/context";

// Mock do db
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    createVenda: vi.fn().mockResolvedValue(1),
    createItemVenda: vi.fn().mockResolvedValue(1),
    createPagamento: vi.fn().mockResolvedValue(1),
  };
});

// Mock do taxas-helper
vi.mock("./taxas-helper", async () => {
  const actual = await vi.importActual("./taxas-helper");
  return {
    ...actual,
    calcularPagamentoCartao: vi.fn().mockResolvedValue({
      valorLiquido: 55000,
      taxaAplicada: 0,
      taxaPercentual: 0,
    }),
    calcularPagamentoSemTaxa: vi.fn().mockReturnValue({
      valorLiquido: 55000,
      taxaAplicada: 0,
    }),
  };
});

describe("vendas.create", () => {
  const mockUser = {
    id: 1,
    openId: "test-user",
    name: "Test User",
    email: "test@test.com",
    role: "administrador" as const,
  };

  const createCaller = () => {
    const ctx = createInnerTRPCContext({
      req: { headers: {} } as any,
      res: { clearCookie: vi.fn() } as any,
      user: mockUser,
    });
    return appRouter.createCaller(ctx);
  };

  it("deve criar uma venda com pagamento em dinheiro", async () => {
    const caller = createCaller();
    
    const input = {
      eventoId: 1,
      formandoId: 1,
      dataVenda: new Date("2026-01-13T12:00:00"),
      itens: [
        {
          produtoId: 1,
          produto: "10 Fotos",
          categoria: "Foto",
          quantidade: 1,
          valorUnitario: 55000,
          ajusteValor: 0,
          justificativa: "",
        },
      ],
      pagamentos: [
        {
          tipo: "dinheiro" as const,
          valor: 55000,
          parcelas: 1,
        },
      ],
    };

    const result = await caller.vendas.create(input);
    
    expect(result).toEqual({ success: true, id: 1 });
  });

  it("deve criar uma venda com pagamento em PIX", async () => {
    const caller = createCaller();
    
    const input = {
      eventoId: 1,
      formandoId: 1,
      dataVenda: new Date("2026-01-13T12:00:00"),
      itens: [
        {
          produtoId: 1,
          produto: "10 Fotos",
          categoria: "Foto",
          quantidade: 1,
          valorUnitario: 55000,
          ajusteValor: 0,
          justificativa: "",
        },
      ],
      pagamentos: [
        {
          tipo: "pix" as const,
          valor: 55000,
          parcelas: 1,
          cvNsu: "123456",
        },
      ],
    };

    const result = await caller.vendas.create(input);
    
    expect(result).toEqual({ success: true, id: 1 });
  });
});
