import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import type { Request } from "express";

describe("Auth Fallback Mechanism", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create approved user when OAuth server is unavailable", async () => {
    // Mock request with valid session cookie
    const mockRequest = {
      headers: {
        cookie: "session=valid_jwt_token",
      },
    } as Request;

    // Mock verifySession to return valid session
    const mockSession = {
      openId: "test-open-id-123",
      appId: "test-app-id",
      name: "Test User",
    };
    vi.spyOn(sdk as any, "verifySession").mockResolvedValue(mockSession);

    // Mock getUserByOpenId first call to return null (user doesn't exist)
    const getUserByOpenIdSpy = vi.spyOn(db, "getUserByOpenId");
    getUserByOpenIdSpy.mockResolvedValueOnce(null);

    // Mock getUserInfoWithJwt to throw error (OAuth unavailable)
    vi.spyOn(sdk as any, "getUserInfoWithJwt").mockRejectedValue(
      new Error("Service Unavailable")
    );

    // Mock upsertUser to capture the call
    const upsertUserSpy = vi.spyOn(db, "upsertUser").mockResolvedValue();

    // Mock getUserByOpenId second call to return the created user
    const mockUser = {
      id: 1,
      openId: "test-open-id-123",
      name: "Test User",
      email: null,
      loginMethod: null,
      role: "coordenador" as const,
      status: "aprovado" as const,
      tipoUsuarioId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    getUserByOpenIdSpy.mockResolvedValueOnce(mockUser);

    // Mock cleanupDuplicateUsers
    vi.spyOn(db, "cleanupDuplicateUsers").mockResolvedValue();

    // Execute authentication
    const result = await sdk.authenticateRequest(mockRequest);

    // Verify fallback user was created with approved status (first call)
    expect(upsertUserSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        openId: "test-open-id-123",
        name: "Test User",
        status: "aprovado",
      })
    );

    // Verify lastSignedIn was updated (second call)
    expect(upsertUserSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        openId: "test-open-id-123",
        lastSignedIn: expect.any(Date),
      })
    );

    // Verify user was returned
    expect(result).toEqual(mockUser);
    expect(result.status).toBe("aprovado");
  });

  it("should create approved user when syncing from OAuth successfully", async () => {
    // Mock request with valid session cookie
    const mockRequest = {
      headers: {
        cookie: "session=valid_jwt_token",
      },
    } as Request;

    // Mock verifySession to return valid session
    const mockSession = {
      openId: "test-open-id-456",
      appId: "test-app-id",
      name: "OAuth User",
    };
    vi.spyOn(sdk as any, "verifySession").mockResolvedValue(mockSession);

    // Mock getUserByOpenId first call to return null (user doesn't exist)
    const getUserByOpenIdSpy = vi.spyOn(db, "getUserByOpenId");
    getUserByOpenIdSpy.mockResolvedValueOnce(null);

    // Mock getUserInfoWithJwt to return user info
    const mockUserInfo = {
      openId: "test-open-id-456",
      name: "OAuth User",
      email: "oauth@example.com",
      loginMethod: "google",
      platform: "google",
    };
    vi.spyOn(sdk as any, "getUserInfoWithJwt").mockResolvedValue(mockUserInfo);

    // Mock getUserByEmail to return null (no existing user with email)
    vi.spyOn(db, "getUserByEmail").mockResolvedValue(null);

    // Mock upsertUser to capture the call
    const upsertUserSpy = vi.spyOn(db, "upsertUser").mockResolvedValue();

    // Mock getUserByOpenId second call to return the created user
    const mockUser = {
      id: 2,
      openId: "test-open-id-456",
      name: "OAuth User",
      email: "oauth@example.com",
      loginMethod: "google",
      role: "coordenador" as const,
      status: "aprovado" as const,
      tipoUsuarioId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    getUserByOpenIdSpy.mockResolvedValueOnce(mockUser);

    // Mock cleanupDuplicateUsers
    vi.spyOn(db, "cleanupDuplicateUsers").mockResolvedValue();

    // Execute authentication
    const result = await sdk.authenticateRequest(mockRequest);

    // Verify user was created with approved status (first call)
    expect(upsertUserSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        openId: "test-open-id-456",
        name: "OAuth User",
        email: "oauth@example.com",
        status: "aprovado",
      })
    );

    // Verify lastSignedIn was updated (second call)
    expect(upsertUserSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        openId: "test-open-id-456",
        lastSignedIn: expect.any(Date),
      })
    );

    // Verify user was returned
    expect(result).toEqual(mockUser);
    expect(result.status).toBe("aprovado");
  });

  it("should reject user with pending status", async () => {
    // Mock request with valid session cookie
    const mockRequest = {
      headers: {
        cookie: "session=valid_jwt_token",
      },
    } as Request;

    // Mock verifySession to return valid session
    const mockSession = {
      openId: "test-open-id-789",
      appId: "test-app-id",
      name: "Pending User",
    };
    vi.spyOn(sdk as any, "verifySession").mockResolvedValue(mockSession);

    // Mock getUserByOpenId to return user with pending status
    const mockPendingUser = {
      id: 3,
      openId: "test-open-id-789",
      name: "Pending User",
      email: "pending@example.com",
      loginMethod: "email",
      role: "coordenador" as const,
      status: "pendente" as const,
      tipoUsuarioId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    vi.spyOn(db, "getUserByOpenId").mockResolvedValue(mockPendingUser);

    // Mock cleanupDuplicateUsers
    vi.spyOn(db, "cleanupDuplicateUsers").mockResolvedValue();

    // Execute authentication and expect it to throw
    await expect(sdk.authenticateRequest(mockRequest)).rejects.toThrow(
      "User account is pending approval"
    );
  });
});
