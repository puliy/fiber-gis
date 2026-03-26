import { and, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  AuditLog,
  Building,
  Cable,
  CableDuct,
  CableTemplate,
  InsertBuilding,
  InsertCable,
  InsertMapPoint,
  InsertUser,
  MapPoint,
  PublicMapToken,
  Region,
  auditLog,
  buildings,
  cableDucts,
  cableTemplates,
  cables,
  mapPoints,
  publicMapTokens,
  regions,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin" | "viewer") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─── Regions ──────────────────────────────────────────────────────────────────

export async function getRegions(): Promise<Region[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(regions).where(eq(regions.isActive, true)).orderBy(regions.name);
}

export async function getRegionById(id: number): Promise<Region | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(regions).where(eq(regions.id, id)).limit(1);
  return result[0];
}

export async function createRegion(data: typeof regions.$inferInsert): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(regions).values(data);
  return (result[0] as any).insertId;
}

export async function updateRegion(id: number, data: Partial<typeof regions.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(regions).set(data).where(eq(regions.id, id));
}

// ─── Map Points ───────────────────────────────────────────────────────────────

export async function getMapPointsInBounds(
  regionId: number,
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number,
  limit = 2000
): Promise<MapPoint[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(mapPoints)
    .where(
      and(
        eq(mapPoints.regionId, regionId),
        gte(mapPoints.lat, String(minLat)),
        lte(mapPoints.lat, String(maxLat)),
        gte(mapPoints.lng, String(minLng)),
        lte(mapPoints.lng, String(maxLng))
      )
    )
    .limit(limit);
}

export async function getMapPointById(id: number): Promise<MapPoint | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(mapPoints).where(eq(mapPoints.id, id)).limit(1);
  return result[0];
}

export async function createMapPoint(data: InsertMapPoint, userId: number, userName: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(mapPoints).values({ ...data, createdBy: userId, updatedBy: userId });
  const insertId = (result[0] as any).insertId;
  await writeAuditLog("map_points", insertId, "INSERT", userId, userName, null, data);
  return insertId;
}

export async function updateMapPoint(
  id: number,
  data: Partial<InsertMapPoint>,
  userId: number,
  userName: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const old = await getMapPointById(id);
  await db.update(mapPoints).set({ ...data, updatedBy: userId }).where(eq(mapPoints.id, id));
  const changedFields = old ? Object.keys(data).filter((k) => (old as any)[k] !== (data as any)[k]) : Object.keys(data);
  await writeAuditLog("map_points", id, "UPDATE", userId, userName, old, data, changedFields);
}

export async function deleteMapPoint(id: number, userId: number, userName: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const old = await getMapPointById(id);
  await db.delete(mapPoints).where(eq(mapPoints.id, id));
  await writeAuditLog("map_points", id, "DELETE", userId, userName, old, null);
}

// ─── Cables ───────────────────────────────────────────────────────────────────

export async function getCablesInBounds(
  regionId: number,
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number,
  limit = 1000
): Promise<Cable[]> {
  const db = await getDb();
  if (!db) return [];
  // Load cables whose bounding box overlaps the viewport
  return db
    .select()
    .from(cables)
    .where(
      and(
        eq(cables.regionId, regionId),
        lte(cables.bboxMinLat, String(maxLat)),
        gte(cables.bboxMaxLat, String(minLat)),
        lte(cables.bboxMinLng, String(maxLng)),
        gte(cables.bboxMaxLng, String(minLng))
      )
    )
    .limit(limit);
}

export async function getCableById(id: number): Promise<Cable | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cables).where(eq(cables.id, id)).limit(1);
  return result[0];
}

export async function createCable(data: InsertCable, userId: number, userName: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(cables).values({ ...data, createdBy: userId, updatedBy: userId });
  const insertId = (result[0] as any).insertId;
  await writeAuditLog("cables", insertId, "INSERT", userId, userName, null, data);
  return insertId;
}

export async function updateCable(
  id: number,
  data: Partial<InsertCable>,
  userId: number,
  userName: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const old = await getCableById(id);
  await db.update(cables).set({ ...data, updatedBy: userId }).where(eq(cables.id, id));
  const changedFields = old ? Object.keys(data).filter((k) => (old as any)[k] !== (data as any)[k]) : Object.keys(data);
  await writeAuditLog("cables", id, "UPDATE", userId, userName, old, data, changedFields);
}

export async function deleteCable(id: number, userId: number, userName: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const old = await getCableById(id);
  await db.delete(cables).where(eq(cables.id, id));
  await writeAuditLog("cables", id, "DELETE", userId, userName, old, null);
}

// ─── Buildings ────────────────────────────────────────────────────────────────

export async function getBuildingsInBounds(
  regionId: number,
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number,
  limit = 500
): Promise<Building[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(buildings)
    .where(
      and(
        eq(buildings.regionId, regionId),
        lte(buildings.bboxMinLat, String(maxLat)),
        gte(buildings.bboxMaxLat, String(minLat)),
        lte(buildings.bboxMinLng, String(maxLng)),
        gte(buildings.bboxMaxLng, String(minLng))
      )
    )
    .limit(limit);
}

export async function getBuildingById(id: number): Promise<Building | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(buildings).where(eq(buildings.id, id)).limit(1);
  return result[0];
}

export async function createBuilding(data: InsertBuilding, userId: number, userName: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(buildings).values({ ...data, createdBy: userId });
  const insertId = (result[0] as any).insertId;
  await writeAuditLog("buildings", insertId, "INSERT", userId, userName, null, data);
  return insertId;
}

export async function updateBuilding(
  id: number,
  data: Partial<InsertBuilding>,
  userId: number,
  userName: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const old = await getBuildingById(id);
  await db.update(buildings).set(data).where(eq(buildings.id, id));
  const changedFields = old ? Object.keys(data).filter((k) => (old as any)[k] !== (data as any)[k]) : Object.keys(data);
  await writeAuditLog("buildings", id, "UPDATE", userId, userName, old, data, changedFields);
}

export async function deleteBuilding(id: number, userId: number, userName: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const old = await getBuildingById(id);
  await db.delete(buildings).where(eq(buildings.id, id));
  await writeAuditLog("buildings", id, "DELETE", userId, userName, old, null);
}

// ─── Cable Templates ──────────────────────────────────────────────────────────

export async function getCableTemplates(): Promise<CableTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cableTemplates).orderBy(cableTemplates.name);
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export async function writeAuditLog(
  tableName: string,
  objectId: number,
  operation: "INSERT" | "UPDATE" | "DELETE",
  userId: number,
  userName: string,
  oldData: unknown,
  newData: unknown,
  changedFields?: string[]
) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(auditLog).values({
      tableName,
      objectId,
      operation,
      userId,
      userName,
      oldData: oldData as any,
      newData: newData as any,
      changedFields: changedFields as any,
    });
  } catch (e) {
    console.warn("[AuditLog] Failed to write:", e);
  }
}

export async function getAuditLog(tableName: string, objectId: number, limit = 50): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.tableName, tableName), eq(auditLog.objectId, objectId)))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

export async function getRecentAuditLog(limit = 100): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
}

// ─── Public Map Tokens ────────────────────────────────────────────────────────

export async function getPublicTokens(): Promise<PublicMapToken[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(publicMapTokens).orderBy(desc(publicMapTokens.createdAt));
}

export async function validatePublicToken(token: string): Promise<PublicMapToken | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(publicMapTokens)
    .where(and(eq(publicMapTokens.token, token), eq(publicMapTokens.isActive, true)))
    .limit(1);
  const t = result[0];
  if (!t) return undefined;
  if (t.expiresAt && new Date(t.expiresAt) < new Date()) return undefined;
  return t;
}

export async function createPublicToken(
  data: typeof publicMapTokens.$inferInsert
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(publicMapTokens).values(data);
  return (result[0] as any).insertId;
}

export async function deletePublicToken(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(publicMapTokens).where(eq(publicMapTokens.id, id));
}

export async function createCableTemplate(data: { name: string; fiberCount: number; description?: string }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(cableTemplates).values({
    name: data.name,
    fiberCount: data.fiberCount,
    description: data.description ?? null,
  });
}

export async function searchMapPoints(regionId: number, query: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const pattern = `%${query}%`;
  return db
    .select({ id: mapPoints.id, name: mapPoints.name, type: mapPoints.type, lat: mapPoints.lat, lng: mapPoints.lng })
    .from(mapPoints)
    .where(
      and(
        eq(mapPoints.regionId, regionId),
        or(like(mapPoints.name, pattern), like(mapPoints.address, pattern))
      )
    )
    .limit(limit);
}
