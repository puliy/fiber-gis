import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Test Context Factories ───────────────────────────────────────────────────

function createAnonContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createUserContext(role: "user" | "admin" | "viewer" = "user"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe("auth", () => {
  it("me returns null for anonymous user", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("me returns user for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Test User");
    expect(result?.role).toBe("user");
  });

  it("logout clears session cookie", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      user: createUserContext().user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string) => clearedCookies.push(name),
      } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBeGreaterThan(0);
  });
});

// ─── Regions Tests ────────────────────────────────────────────────────────────

describe("regions", () => {
  it("list is public and returns array", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    const result = await caller.regions.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("list returns regions for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.regions.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Admin Tests ──────────────────────────────────────────────────────────────

describe("admin", () => {
  it("users requires admin role", async () => {
    const caller = appRouter.createCaller(createUserContext("user"));
    await expect(caller.admin.users()).rejects.toThrow();
  });

  it("users returns array for admin", async () => {
    const caller = appRouter.createCaller(createUserContext("admin"));
    const result = await caller.admin.users();
    expect(Array.isArray(result)).toBe(true);
  });

  it("updateUserRole requires admin role", async () => {
    const caller = appRouter.createCaller(createUserContext("user"));
    await expect(
      caller.admin.updateUserRole({ userId: 99, role: "viewer" })
    ).rejects.toThrow();
  });
});

// ─── MapPoints Tests ──────────────────────────────────────────────────────────

describe("mapPoints", () => {
  it("inBounds requires authentication", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(
      caller.mapPoints.inBounds({
        regionId: 1, minLat: 51.5, minLng: 39.0, maxLat: 51.8, maxLng: 39.4,
      })
    ).rejects.toThrow();
  });

  it("inBounds returns array for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.mapPoints.inBounds({
      regionId: 1, minLat: 51.5, minLng: 39.0, maxLat: 51.8, maxLng: 39.4,
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("search requires authentication", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(
      caller.mapPoints.search({ regionId: 1, query: "узел" })
    ).rejects.toThrow();
  });

  it("search returns array for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.mapPoints.search({ regionId: 1, query: "узел" });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Cables Tests ─────────────────────────────────────────────────────────────

describe("cables", () => {
  it("inBounds requires authentication", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(
      caller.cables.inBounds({
        regionId: 1, minLat: 51.5, minLng: 39.0, maxLat: 51.8, maxLng: 39.4,
      })
    ).rejects.toThrow();
  });

  it("templates returns array for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.cables.templates();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Public Map Tests ─────────────────────────────────────────────────────────

describe("publicMap", () => {
  it("validate returns falsy for invalid token", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    const result = await caller.publicMap.validate({ token: "invalid-token-xyz" });
    expect(result == null).toBe(true); // null or undefined both indicate invalid token
  });
});

// ─── Fiber Colors Tests ───────────────────────────────────────────────────────

describe("fiberColors", () => {
  it("list is public and returns array", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    const result = await caller.fiberColors.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("list returns 12 IEC 60304 colors for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.fiberColors.list();
    expect(Array.isArray(result)).toBe(true);
    // Should have 12 standard IEC colors seeded
    expect(result.length).toBeGreaterThanOrEqual(12);
  });

  it("colors have required fields", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.fiberColors.list();
    if (result.length > 0) {
      const first = result[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("hexCode");
    }
  });
});

// ─── Cable Modules Tests ──────────────────────────────────────────────────────

describe("cableModules", () => {
  it("byTemplate requires authentication", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(
      caller.cableModules.byTemplate({ templateId: 1 })
    ).rejects.toThrow();
  });

  it("byTemplate returns array for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.cableModules.byTemplate({ templateId: 9999 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("fibersByModule requires authentication", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(
      caller.cableModules.fibersByModule({ moduleId: 1 })
    ).rejects.toThrow();
  });

  it("fibersByModule returns array for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.cableModules.fibersByModule({ moduleId: 9999 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("upsertModule requires editor role (not viewer)", async () => {
    const caller = appRouter.createCaller(createUserContext("viewer"));
    await expect(
      caller.cableModules.upsertModule({ templateId: 1, moduleNumber: 1, fiberCount: 12 })
    ).rejects.toThrow();
  });

  it("deleteModule requires editor role (not viewer)", async () => {
    const caller = appRouter.createCaller(createUserContext("viewer"));
    await expect(
      caller.cableModules.deleteModule({ id: 1 })
    ).rejects.toThrow();
  });
});

// ─── Splice Closure Tests ─────────────────────────────────────────────────────

describe("splice", () => {
  it("byMapPoint requires authentication", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(
      caller.splice.byMapPoint({ mapPointId: 1 })
    ).rejects.toThrow();
  });

  it("byMapPoint returns null for non-existent map point", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.splice.byMapPoint({ mapPointId: 999999 });
    expect(result).toBeNull();
  });

  it("byId requires authentication", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(
      caller.splice.byId({ id: 1 })
    ).rejects.toThrow();
  });

  it("byId returns null for non-existent closure", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.splice.byId({ id: 999999 });
    expect(result).toBeNull();
  });

  it("splices requires authentication", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(
      caller.splice.splices({ closureId: 1 })
    ).rejects.toThrow();
  });

  it("splices returns empty array for non-existent closure", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.splice.splices({ closureId: 999999 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("upsert requires editor role (not viewer)", async () => {
    const caller = appRouter.createCaller(createUserContext("viewer"));
    await expect(
      caller.splice.upsert({ mapPointId: 1 })
    ).rejects.toThrow();
  });

  it("deleteSplice requires editor role (not viewer)", async () => {
    const caller = appRouter.createCaller(createUserContext("viewer"));
    await expect(
      caller.splice.deleteSplice({ id: 1 })
    ).rejects.toThrow();
  });
});
