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
  cableModules,
  cableFibers,
  fiberColors,
  spliceClosures,
  fiberSplices,
  opticalCrosses,
  crossPorts,
  portConnections,
  OpticalCross,
  InsertOpticalCross,
  CrossPort,
  InsertCrossPort,
  PortConnection,
  InsertPortConnection,
  activeEquipment,
  equipPorts,
  splitters,
  ActiveEquipment,
  InsertActiveEquipment,
  EquipPort,
  InsertEquipPort,
  Splitter,
  InsertSplitter,
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

// ─── Fiber Colors ─────────────────────────────────────────────────────────────

export async function getFiberColors() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fiberColors).orderBy(fiberColors.sortOrder);
}

// ─── Cable Modules & Fibers ───────────────────────────────────────────────────

export async function getModulesByTemplate(templateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(cableModules)
    .where(eq(cableModules.templateId, templateId))
    .orderBy(cableModules.moduleNumber);
}

export async function getFibersByModule(moduleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(cableFibers)
    .where(eq(cableFibers.moduleId, moduleId))
    .orderBy(cableFibers.fiberNumber);
}

export async function upsertCableModule(data: {
  id?: number;
  templateId: number;
  moduleNumber: number;
  colorId?: number | null;
  fiberCount: number;
  description?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    await db
      .update(cableModules)
      .set({
        moduleNumber: data.moduleNumber,
        colorId: data.colorId ?? null,
        fiberCount: data.fiberCount,
        description: data.description ?? null,
      })
      .where(eq(cableModules.id, data.id));
    return data.id;
  }
  const result = await db.insert(cableModules).values({
    templateId: data.templateId,
    moduleNumber: data.moduleNumber,
    colorId: data.colorId ?? null,
    fiberCount: data.fiberCount,
    description: data.description ?? null,
  });
  return (result[0] as any).insertId as number;
}

export async function deleteCableModule(id: number) {
  const db = await getDb();
  if (!db) return;
  // Cascade delete fibers
  await db.delete(cableFibers).where(eq(cableFibers.moduleId, id));
  await db.delete(cableModules).where(eq(cableModules.id, id));
}

export async function upsertCableFiber(data: {
  id?: number;
  moduleId: number;
  fiberNumber: number;
  colorId?: number | null;
  fiberType?: "G.652D" | "G.657A1" | "G.657A2" | "OM3" | "OM4";
  description?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    await db
      .update(cableFibers)
      .set({
        fiberNumber: data.fiberNumber,
        colorId: data.colorId ?? null,
        fiberType: data.fiberType ?? "G.652D",
        description: data.description ?? null,
      })
      .where(eq(cableFibers.id, data.id));
    return data.id;
  }
  const result = await db.insert(cableFibers).values({
    moduleId: data.moduleId,
    fiberNumber: data.fiberNumber,
    colorId: data.colorId ?? null,
    fiberType: data.fiberType ?? "G.652D",
    description: data.description ?? null,
  });
  return (result[0] as any).insertId as number;
}

export async function deleteCableFiber(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cableFibers).where(eq(cableFibers.id, id));
}

// ─── Splice Closures ──────────────────────────────────────────────────────────

export async function getSpliceClosureByMapPoint(mapPointId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(spliceClosures)
    .where(eq(spliceClosures.mapPointId, mapPointId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSpliceClosureById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(spliceClosures)
    .where(eq(spliceClosures.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertSpliceClosure(data: {
  id?: number;
  mapPointId: number;
  name?: string | null;
  closureType?: "inline" | "branch" | "terminal";
  capacity?: number;
  manufacturer?: string | null;
  model?: string | null;
  description?: string | null;
  createdBy?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    await db
      .update(spliceClosures)
      .set({
        name: data.name ?? null,
        closureType: data.closureType ?? "inline",
        capacity: data.capacity ?? 24,
        manufacturer: data.manufacturer ?? null,
        model: data.model ?? null,
        description: data.description ?? null,
      })
      .where(eq(spliceClosures.id, data.id));
    return data.id;
  }
  const result = await db.insert(spliceClosures).values({
    mapPointId: data.mapPointId,
    name: data.name ?? null,
    closureType: data.closureType ?? "inline",
    capacity: data.capacity ?? 24,
    manufacturer: data.manufacturer ?? null,
    model: data.model ?? null,
    description: data.description ?? null,
    createdBy: data.createdBy ?? null,
  });
  return (result[0] as any).insertId as number;
}

// ─── Fiber Splices ────────────────────────────────────────────────────────────

export async function getFiberSplicesByClosure(closureId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(fiberSplices)
    .where(eq(fiberSplices.closureId, closureId))
    .orderBy(fiberSplices.sortOrder, fiberSplices.id);
}

export async function upsertFiberSplice(data: {
  id?: number;
  closureId: number;
  cableAId?: number | null;
  moduleANumber?: number | null;
  fiberANumber?: number | null;
  cableBId?: number | null;
  moduleBNumber?: number | null;
  fiberBNumber?: number | null;
  spliceType?: "fusion" | "mechanical";
  loss?: string | null;
  notes?: string | null;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const payload = {
    closureId: data.closureId,
    cableAId: data.cableAId ?? null,
    moduleANumber: data.moduleANumber ?? null,
    fiberANumber: data.fiberANumber ?? null,
    cableBId: data.cableBId ?? null,
    moduleBNumber: data.moduleBNumber ?? null,
    fiberBNumber: data.fiberBNumber ?? null,
    spliceType: data.spliceType ?? "fusion",
    loss: data.loss ?? null,
    notes: data.notes ?? null,
    sortOrder: data.sortOrder ?? 0,
  };
  if (data.id) {
    await db.update(fiberSplices).set(payload).where(eq(fiberSplices.id, data.id));
    return data.id;
  }
  const result = await db.insert(fiberSplices).values(payload);
  return (result[0] as any).insertId as number;
}

export async function deleteFiberSplice(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(fiberSplices).where(eq(fiberSplices.id, id));
}

export async function deleteSpliceClosure(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(fiberSplices).where(eq(fiberSplices.closureId, id));
  await db.delete(spliceClosures).where(eq(spliceClosures.id, id));
}

// ─── Optical Crosses (ODF) ─────────────────────────────────────────────────

export async function getOpticalCrossesByMapPoint(mapPointId: number): Promise<OpticalCross[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(opticalCrosses).where(eq(opticalCrosses.mapPointId, mapPointId));
}

export async function getOpticalCrossById(id: number): Promise<OpticalCross | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(opticalCrosses).where(eq(opticalCrosses.id, id)).limit(1);
  return rows[0];
}

export async function getAllOpticalCrosses(): Promise<OpticalCross[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(opticalCrosses);
}

export async function upsertOpticalCross(data: InsertOpticalCross & { id?: number }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { id, ...payload } = data;
  if (id) {
    await db.update(opticalCrosses).set(payload).where(eq(opticalCrosses.id, id));
    return id;
  }
  const result = await db.insert(opticalCrosses).values(payload);
  return (result[0] as any).insertId as number;
}

export async function deleteOpticalCross(id: number) {
  const db = await getDb();
  if (!db) return;
  // Каскадно удаляем коммутации и порты
  const ports = await db.select({ id: crossPorts.id }).from(crossPorts).where(eq(crossPorts.crossId, id));
  const portIds = ports.map(p => p.id);
  if (portIds.length > 0) {
    await db.delete(portConnections).where(eq(portConnections.crossId, id));
    await db.delete(crossPorts).where(eq(crossPorts.crossId, id));
  }
  await db.delete(opticalCrosses).where(eq(opticalCrosses.id, id));
}

// ─── Cross Ports ──────────────────────────────────────────────────────────

export async function getCrossPortsByCross(crossId: number): Promise<CrossPort[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(crossPorts).where(eq(crossPorts.crossId, crossId))
    .orderBy(crossPorts.portNumber);
}

export async function upsertCrossPort(data: InsertCrossPort & { id?: number }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { id, ...payload } = data;
  if (id) {
    await db.update(crossPorts).set(payload).where(eq(crossPorts.id, id));
    return id;
  }
  const result = await db.insert(crossPorts).values(payload);
  return (result[0] as any).insertId as number;
}

export async function deleteCrossPort(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(portConnections).where(eq(portConnections.portAId, id));
  await db.delete(portConnections).where(eq(portConnections.portBId, id));
  await db.delete(crossPorts).where(eq(crossPorts.id, id));
}

// ─── Port Connections ─────────────────────────────────────────────────────

export async function getPortConnectionsByCross(crossId: number): Promise<PortConnection[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(portConnections).where(eq(portConnections.crossId, crossId));
}

export async function upsertPortConnection(data: InsertPortConnection & { id?: number }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { id, ...payload } = data;
  if (id) {
    await db.update(portConnections).set(payload).where(eq(portConnections.id, id));
    return id;
  }
  const result = await db.insert(portConnections).values(payload);
  return (result[0] as any).insertId as number;
}

export async function deletePortConnection(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(portConnections).where(eq(portConnections.id, id));
}

// ─── Fiber Trace ──────────────────────────────────────────────────────────────
// Трассировка волокна: находим все сварки, через которые проходит данное волокно
// Возвращает цепочку: [{closureId, closureName, mapPointId, cableAId, moduleA, fiberA, cableBId, moduleB, fiberB, loss}]

export type TraceHop = {
  closureId: number;
  closureName: string | null;
  mapPointId: number;
  lat: string | null;
  lng: string | null;
  cableAId: number | null;
  moduleANumber: number | null;
  fiberANumber: number | null;
  cableBId: number | null;
  moduleBNumber: number | null;
  fiberBNumber: number | null;
  loss: string | null;
  spliceType: string | null;
};

export async function traceFiber(
  startCableId: number,
  startModule: number,
  startFiber: number,
  maxHops = 50
): Promise<TraceHop[]> {
  const db = await getDb();
  if (!db) return [];

  const hops: TraceHop[] = [];
  let currentCableId = startCableId;
  let currentModule = startModule;
  let currentFiber = startFiber;
  const visited = new Set<string>();

  for (let i = 0; i < maxHops; i++) {
    const key = `${currentCableId}:${currentModule}:${currentFiber}`;
    if (visited.has(key)) break;
    visited.add(key);

    // Ищем сварку где это волокно — сторона A или сторона B
    const splicesA = await db
      .select()
      .from(fiberSplices)
      .where(
        and(
          eq(fiberSplices.cableAId, currentCableId),
          eq(fiberSplices.moduleANumber, currentModule),
          eq(fiberSplices.fiberANumber, currentFiber)
        )
      )
      .limit(1);

    const splicesB = await db
      .select()
      .from(fiberSplices)
      .where(
        and(
          eq(fiberSplices.cableBId, currentCableId),
          eq(fiberSplices.moduleBNumber, currentModule),
          eq(fiberSplices.fiberBNumber, currentFiber)
        )
      )
      .limit(1);

    const splice = splicesA[0] ?? splicesB[0];
    if (!splice) break;

    // Получаем данные муфты
    const closures = await db
      .select()
      .from(spliceClosures)
      .where(eq(spliceClosures.id, splice.closureId))
      .limit(1);
    const closure = closures[0];

    // Получаем координаты точки на карте
    let pointLat: string | null = null;
    let pointLng: string | null = null;
    if (closure?.mapPointId) {
      const pts = await db
        .select({ lat: mapPoints.lat, lng: mapPoints.lng })
        .from(mapPoints)
        .where(eq(mapPoints.id, closure.mapPointId))
        .limit(1);
      if (pts[0]) { pointLat = pts[0].lat; pointLng = pts[0].lng; }
    }

    hops.push({
      closureId: splice.closureId,
      closureName: closure?.name ?? null,
      mapPointId: closure?.mapPointId ?? 0,
      lat: pointLat,
      lng: pointLng,
      cableAId: splice.cableAId,
      moduleANumber: splice.moduleANumber,
      fiberANumber: splice.fiberANumber,
      cableBId: splice.cableBId,
      moduleBNumber: splice.moduleBNumber,
      fiberBNumber: splice.fiberBNumber,
      loss: splice.loss?.toString() ?? null,
      spliceType: splice.spliceType,
    });

    // Переходим на другую сторону сварки
    if (splicesA[0]) {
      // Пришли по стороне A — продолжаем по стороне B
      if (!splice.cableBId || !splice.moduleBNumber || !splice.fiberBNumber) break;
      currentCableId = splice.cableBId;
      currentModule = splice.moduleBNumber;
      currentFiber = splice.fiberBNumber;
    } else {
      // Пришли по стороне B — продолжаем по стороне A
      if (!splice.cableAId || !splice.moduleANumber || !splice.fiberANumber) break;
      currentCableId = splice.cableAId;
      currentModule = splice.moduleANumber;
      currentFiber = splice.fiberANumber;
    }
  }

  return hops;
}

// ─── Active Equipment ──────────────────────────────────────────────────────────

export async function getEquipmentByRegion(regionId: number) {
  const db = await getDb(); if (!db) return null as any;
  return db.select().from(activeEquipment).where(eq(activeEquipment.regionId, regionId)).orderBy(activeEquipment.name);
}

export async function getEquipmentByMapPoint(mapPointId: number) {
  const db = await getDb(); if (!db) return null as any;
  return db.select().from(activeEquipment).where(eq(activeEquipment.mapPointId, mapPointId));
}

export async function getEquipmentById(id: number) {
  const db = await getDb(); if (!db) return null as any;
  const rows = await db.select().from(activeEquipment).where(eq(activeEquipment.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function upsertEquipment(data: InsertActiveEquipment & { id?: number }) {
  const db = await getDb(); if (!db) return null as any;
  if (data.id) {
    await db.update(activeEquipment).set({ ...data, updatedAt: new Date() }).where(eq(activeEquipment.id, data.id));
    return data.id;
  }
  const [result] = await db.insert(activeEquipment).values(data);
  return (result as any).insertId as number;
}

export async function deleteEquipment(id: number) {
  const db = await getDb(); if (!db) return null as any;
  await db.delete(equipPorts).where(eq(equipPorts.equipId, id));
  await db.delete(activeEquipment).where(eq(activeEquipment.id, id));
}

export async function getEquipPorts(equipId: number) {
  const db = await getDb(); if (!db) return null as any;
  return db.select().from(equipPorts).where(eq(equipPorts.equipId, equipId)).orderBy(equipPorts.portName);
}

export async function upsertEquipPort(data: InsertEquipPort & { id?: number }) {
  const db = await getDb(); if (!db) return null as any;
  if (data.id) {
    await db.update(equipPorts).set(data).where(eq(equipPorts.id, data.id));
    return data.id;
  }
  const [result] = await db.insert(equipPorts).values(data);
  return (result as any).insertId as number;
}

export async function deleteEquipPort(id: number) {
  const db = await getDb(); if (!db) return null as any;
  await db.delete(equipPorts).where(eq(equipPorts.id, id));
}

// ─── Splitters ─────────────────────────────────────────────────────────────────

export async function getSplittersByRegion(regionId: number) {
  const db = await getDb(); if (!db) return null as any;
  return db.select().from(splitters).where(eq(splitters.regionId, regionId)).orderBy(splitters.name);
}

export async function getSplittersByMapPoint(mapPointId: number) {
  const db = await getDb(); if (!db) return null as any;
  return db.select().from(splitters).where(eq(splitters.mapPointId, mapPointId));
}

export async function getSplitterById(id: number) {
  const db = await getDb(); if (!db) return null as any;
  const rows = await db.select().from(splitters).where(eq(splitters.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function upsertSplitter(data: InsertSplitter & { id?: number }) {
  const db = await getDb(); if (!db) return null as any;
  if (data.id) {
    await db.update(splitters).set({ ...data, updatedAt: new Date() }).where(eq(splitters.id, data.id));
    return data.id;
  }
  const [result] = await db.insert(splitters).values(data);
  return (result as any).insertId as number;
}

export async function deleteSplitter(id: number) {
  const db = await getDb(); if (!db) return null as any;
  await db.delete(splitters).where(eq(splitters.id, id));
}

// ─── Cable Ducts ──────────────────────────────────────────────────────────────
export async function getCableDuctsByBounds(regionId: number, minLat: number, minLng: number, maxLat: number, maxLng: number) {
  const db = await getDb(); if (!db) return null as any;
  return db.select().from(cableDucts).where(
    and(
      eq(cableDucts.regionId, regionId),
      gte(cableDucts.bboxMinLat, String(minLat - 0.01)),
      lte(cableDucts.bboxMaxLat, String(maxLat + 0.01)),
      gte(cableDucts.bboxMinLng, String(minLng - 0.01)),
      lte(cableDucts.bboxMaxLng, String(maxLng + 0.01))
    )
  );
}
export async function getCableDuctsByRegion(regionId: number) {
  const db = await getDb(); if (!db) return null as any;
  return db.select().from(cableDucts).where(eq(cableDucts.regionId, regionId)).orderBy(cableDucts.id);
}
export async function getCableDuctById(id: number) {
  const db = await getDb(); if (!db) return null as any;
  const rows = await db.select().from(cableDucts).where(eq(cableDucts.id, id)).limit(1);
  return rows[0] ?? null;
}
export async function upsertCableDuct(data: Partial<CableDuct> & { regionId: number; route: { lat: number; lng: number }[] }) {
  const db = await getDb(); if (!db) return null as any;
  // Compute bounding box
  const lats = data.route.map((p) => p.lat);
  const lngs = data.route.map((p) => p.lng);
  const bbox = {
    bboxMinLat: String(Math.min(...lats)),
    bboxMaxLat: String(Math.max(...lats)),
    bboxMinLng: String(Math.min(...lngs)),
    bboxMaxLng: String(Math.max(...lngs)),
  };
  const payload = { ...data, ...bbox, route: JSON.stringify(data.route) };
  if (data.id) {
    await db.update(cableDucts).set({ ...payload, updatedAt: new Date() }).where(eq(cableDucts.id, data.id));
    return data.id;
  }
  const [result] = await db.insert(cableDucts).values(payload as any);
  return (result as any).insertId as number;
}
export async function deleteCableDuct(id: number) {
  const db = await getDb(); if (!db) return null as any;
  await db.delete(cableDucts).where(eq(cableDucts.id, id));
}
