import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Auth Status Validation", () => {
  it("deve ter função updateUserStatus disponível", () => {
    expect(db.updateUserStatus).toBeDefined();
    expect(typeof db.updateUserStatus).toBe("function");
  });

  it("deve ter função getUserByOpenId disponível", () => {
    expect(db.getUserByOpenId).toBeDefined();
    expect(typeof db.getUserByOpenId).toBe("function");
  });

  it("deve ter função upsertUser disponível", () => {
    expect(db.upsertUser).toBeDefined();
    expect(typeof db.upsertUser).toBe("function");
  });
});
