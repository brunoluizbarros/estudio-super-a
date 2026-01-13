import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "administrador",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    tipoUsuarioId: null,
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("usuarios.updateTipoUsuario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update user tipoUsuarioId successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Mock the database call
    const mockUpdateUserTipoUsuario = vi.fn().mockResolvedValue(undefined);
    
    // Spy on the db module
    const dbModule = await import("./db");
    vi.spyOn(dbModule, "updateUserTipoUsuario").mockImplementation(mockUpdateUserTipoUsuario);

    try {
      const result = await caller.usuarios.updateTipoUsuario({
        userId: 2,
        tipoUsuarioId: 5,
      });

      expect(result).toEqual({ success: true });
      expect(mockUpdateUserTipoUsuario).toHaveBeenCalledWith(2, 5);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("should handle null tipoUsuarioId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mockUpdateUserTipoUsuario = vi.fn().mockResolvedValue(undefined);
    
    const dbModule = await import("./db");
    vi.spyOn(dbModule, "updateUserTipoUsuario").mockImplementation(mockUpdateUserTipoUsuario);

    try {
      const result = await caller.usuarios.updateTipoUsuario({
        userId: 2,
        tipoUsuarioId: null,
      });

      expect(result).toEqual({ success: true });
      expect(mockUpdateUserTipoUsuario).toHaveBeenCalledWith(2, null);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("should reject unauthenticated users", async () => {
    const ctx = createAuthContext();
    ctx.user = null;
    
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.usuarios.updateTipoUsuario({
        userId: 2,
        tipoUsuarioId: 5,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("UNAUTHORIZED");
    }
  });
});
