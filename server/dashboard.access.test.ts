import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("Dashboard Access Control", () => {
  // Mock context para diferentes tipos de usuários
  const createMockContext = (role: string): TrpcContext => ({
    req: {} as any,
    res: {} as any,
    user: {
      id: 1,
      email: `test-${role}@example.com`,
      name: `Test ${role}`,
      role: role as any,
      openId: `test-${role}-openid`,
      status: "aprovado" as const,
      tipoUsuarioId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const createUnauthenticatedContext = (): TrpcContext => ({
    req: {} as any,
    res: {} as any,
    user: null,
  });

  describe("dashboard.stats", () => {
    it("deve permitir acesso para Administrador", async () => {
      const ctx = createMockContext("administrador");
      const caller = appRouter.createCaller(ctx);

      // Não deve lançar erro
      await expect(caller.dashboard.stats()).resolves.toBeDefined();
    });

    it("deve permitir acesso para Gestor", async () => {
      const ctx = createMockContext("gestor");
      const caller = appRouter.createCaller(ctx);

      // Não deve lançar erro
      await expect(caller.dashboard.stats()).resolves.toBeDefined();
    });

    it("deve negar acesso para Coordenador", async () => {
      const ctx = createMockContext("coordenador");
      const caller = appRouter.createCaller(ctx);

      // Deve lançar erro FORBIDDEN
      await expect(caller.dashboard.stats()).rejects.toThrow(/Acesso negado/);
    });

    it("deve negar acesso para Cerimonial", async () => {
      const ctx = createMockContext("cerimonial");
      const caller = appRouter.createCaller(ctx);

      // Deve lançar erro FORBIDDEN
      await expect(caller.dashboard.stats()).rejects.toThrow(/Acesso negado/);
    });

    it("deve negar acesso para Financeiro", async () => {
      const ctx = createMockContext("financeiro");
      const caller = appRouter.createCaller(ctx);

      // Deve lançar erro FORBIDDEN
      await expect(caller.dashboard.stats()).rejects.toThrow(/Acesso negado/);
    });

    it("deve negar acesso para Logística", async () => {
      const ctx = createMockContext("logistica");
      const caller = appRouter.createCaller(ctx);

      // Deve lançar erro FORBIDDEN
      await expect(caller.dashboard.stats()).rejects.toThrow(/Acesso negado/);
    });

    it("deve negar acesso para usuário não autenticado", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      // Deve lançar erro UNAUTHORIZED
      await expect(caller.dashboard.stats()).rejects.toThrow();
    });
  });

  describe("dashboard.vendasMensais", () => {
    it("deve permitir acesso para Administrador", async () => {
      const ctx = createMockContext("administrador");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.dashboard.vendasMensais({ ano: 2026 })
      ).resolves.toBeDefined();
    });

    it("deve permitir acesso para Gestor", async () => {
      const ctx = createMockContext("gestor");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.dashboard.vendasMensais({ ano: 2026 })
      ).resolves.toBeDefined();
    });

    it("deve negar acesso para outros tipos de usuário", async () => {
      const ctx = createMockContext("coordenador");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.dashboard.vendasMensais({ ano: 2026 })
      ).rejects.toThrow(/Acesso negado/);
    });
  });

  describe("dashboard.despesasMensais", () => {
    it("deve permitir acesso para Administrador", async () => {
      const ctx = createMockContext("administrador");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.dashboard.despesasMensais({ ano: 2026 })
      ).resolves.toBeDefined();
    });

    it("deve permitir acesso para Gestor", async () => {
      const ctx = createMockContext("gestor");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.dashboard.despesasMensais({ ano: 2026 })
      ).resolves.toBeDefined();
    });

    it("deve negar acesso para outros tipos de usuário", async () => {
      const ctx = createMockContext("financeiro");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.dashboard.despesasMensais({ ano: 2026 })
      ).rejects.toThrow(/Acesso negado/);
    });
  });
});
