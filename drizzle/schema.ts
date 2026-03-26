import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "viewer"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Regions ──────────────────────────────────────────────────────────────────

export const regions = mysqlTable("regions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // Center coordinates for map centering
  centerLat: decimal("center_lat", { precision: 10, scale: 7 }).notNull(),
  centerLng: decimal("center_lng", { precision: 10, scale: 7 }).notNull(),
  defaultZoom: int("default_zoom").default(13).notNull(),
  // Bounding box for region
  bboxMinLat: decimal("bbox_min_lat", { precision: 10, scale: 7 }),
  bboxMinLng: decimal("bbox_min_lng", { precision: 10, scale: 7 }),
  bboxMaxLat: decimal("bbox_max_lat", { precision: 10, scale: 7 }),
  bboxMaxLng: decimal("bbox_max_lng", { precision: 10, scale: 7 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Region = typeof regions.$inferSelect;
export type InsertRegion = typeof regions.$inferInsert;

// ─── Map Points (Poles, Manholes, Splice Closures, etc.) ──────────────────────

export const mapPoints = mysqlTable("map_points", {
  id: int("id").autoincrement().primaryKey(),
  regionId: int("region_id").notNull(),
  // Geometry stored as lat/lng decimals (PostGIS POINT via raw SQL)
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  type: mysqlEnum("type", [
    "pole",          // Опора
    "manhole",       // Колодец
    "splice",        // Муфта в земле
    "mast",          // Мачта
    "entry_point",   // Точка входа в здание
    "node_district", // Районный узел
    "node_trunk",    // Магистральный узел
    "flag",          // Флаг/метка
    "camera",        // Камера
    "other",         // Прочее
  ]).notNull(),
  status: mysqlEnum("status", ["plan", "fact", "dismantled"]).default("fact").notNull(),
  name: varchar("name", { length: 255 }),
  description: text("description"),
  address: text("address"),
  ownerId: int("owner_id"), // FK to owners table (future)
  attributes: json("attributes"), // Flexible extra attributes
  isPublic: boolean("is_public").default(false).notNull(),
  createdBy: int("created_by"),
  updatedBy: int("updated_by"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MapPoint = typeof mapPoints.$inferSelect;
export type InsertMapPoint = typeof mapPoints.$inferInsert;

// ─── Cable Templates ──────────────────────────────────────────────────────────

export const cableTemplates = mysqlTable("cable_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  manufacturer: varchar("manufacturer", { length: 255 }),
  fiberCount: int("fiber_count").notNull(),
  moduleCount: int("module_count").default(1),
  fibersPerModule: int("fibers_per_module"),
  cableType: mysqlEnum("cable_type", ["single_mode", "multi_mode", "armored", "aerial", "duct"]).default("single_mode"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CableTemplate = typeof cableTemplates.$inferSelect;

// ─── Cables ───────────────────────────────────────────────────────────────────

export const cables = mysqlTable("cables", {
  id: int("id").autoincrement().primaryKey(),
  regionId: int("region_id").notNull(),
  templateId: int("template_id"),
  name: varchar("name", { length: 255 }),
  status: mysqlEnum("status", ["plan", "fact", "dismantled"]).default("fact").notNull(),
  layingType: mysqlEnum("laying_type", ["aerial", "underground", "duct", "building"]).default("aerial"),
  // Route stored as JSON array of {lat, lng} points
  route: json("route").notNull(), // [{lat, lng}, ...]
  // Calculated length in meters
  lengthCalc: decimal("length_calc", { precision: 10, scale: 2 }),
  lengthFact: decimal("length_fact", { precision: 10, scale: 2 }),
  // Bounding box for spatial queries (denormalized for performance)
  bboxMinLat: decimal("bbox_min_lat", { precision: 10, scale: 7 }),
  bboxMinLng: decimal("bbox_min_lng", { precision: 10, scale: 7 }),
  bboxMaxLat: decimal("bbox_max_lat", { precision: 10, scale: 7 }),
  bboxMaxLng: decimal("bbox_max_lng", { precision: 10, scale: 7 }),
  startPointId: int("start_point_id"),
  endPointId: int("end_point_id"),
  description: text("description"),
  attributes: json("attributes"),
  isPublic: boolean("is_public").default(false).notNull(),
  createdBy: int("created_by"),
  updatedBy: int("updated_by"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Cable = typeof cables.$inferSelect;
export type InsertCable = typeof cables.$inferInsert;

// ─── Cable Ducts (Кабельная канализация) ─────────────────────────────────────

export const cableDucts = mysqlTable("cable_ducts", {
  id: int("id").autoincrement().primaryKey(),
  regionId: int("region_id").notNull(),
  name: varchar("name", { length: 255 }),
  capacity: int("capacity").default(1), // Number of tubes
  diameter: int("diameter"), // mm
  material: mysqlEnum("material", ["plastic", "concrete", "metal", "other"]).default("plastic"),
  route: json("route").notNull(), // [{lat, lng}, ...]
  bboxMinLat: decimal("bbox_min_lat", { precision: 10, scale: 7 }),
  bboxMinLng: decimal("bbox_min_lng", { precision: 10, scale: 7 }),
  bboxMaxLat: decimal("bbox_max_lat", { precision: 10, scale: 7 }),
  bboxMaxLng: decimal("bbox_max_lng", { precision: 10, scale: 7 }),
  description: text("description"),
  createdBy: int("created_by"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CableDuct = typeof cableDucts.$inferSelect;

// ─── Buildings ────────────────────────────────────────────────────────────────

export const buildings = mysqlTable("buildings", {
  id: int("id").autoincrement().primaryKey(),
  regionId: int("region_id").notNull(),
  name: varchar("name", { length: 255 }),
  address: text("address"),
  osmId: varchar("osm_id", { length: 64 }),
  // Polygon stored as JSON array of {lat, lng} points
  polygon: json("polygon").notNull(), // [{lat, lng}, ...]
  // Center point for label
  centerLat: decimal("center_lat", { precision: 10, scale: 7 }),
  centerLng: decimal("center_lng", { precision: 10, scale: 7 }),
  bboxMinLat: decimal("bbox_min_lat", { precision: 10, scale: 7 }),
  bboxMinLng: decimal("bbox_min_lng", { precision: 10, scale: 7 }),
  bboxMaxLat: decimal("bbox_max_lat", { precision: 10, scale: 7 }),
  bboxMaxLng: decimal("bbox_max_lng", { precision: 10, scale: 7 }),
  floors: int("floors"),
  description: text("description"),
  attributes: json("attributes"),
  createdBy: int("created_by"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Building = typeof buildings.$inferSelect;
export type InsertBuilding = typeof buildings.$inferInsert;

// ─── Audit Log ────────────────────────────────────────────────────────────────

export const auditLog = mysqlTable("audit_log", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  tableName: varchar("table_name", { length: 64 }).notNull(),
  objectId: int("object_id").notNull(),
  operation: mysqlEnum("operation", ["INSERT", "UPDATE", "DELETE"]).notNull(),
  userId: int("user_id"),
  userName: varchar("user_name", { length: 255 }),
  oldData: json("old_data"),
  newData: json("new_data"),
  changedFields: json("changed_fields"), // Array of field names that changed
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;

// ─── Public Map Tokens ────────────────────────────────────────────────────────

export const publicMapTokens = mysqlTable("public_map_tokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  regionId: int("region_id"), // null = all regions
  allowedLayers: json("allowed_layers"), // ["poles", "cables", ...] null = all public
  isActive: boolean("is_active").default(true).notNull(),
  expiresAt: timestamp("expires_at"),
  createdBy: int("created_by"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PublicMapToken = typeof publicMapTokens.$inferSelect;

// ─── Fiber Colors (IEC 60304 standard) ─────────────────────────────────────────────────────

export const fiberColors = mysqlTable("fiber_colors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),   // Голубой, Оранжевый...
  hexCode: varchar("hex_code", { length: 7 }).notNull(), // #0000FF
  iecNumber: int("iec_number"),                        // 1-12 по IEC 60304
  sortOrder: int("sort_order").default(0).notNull(),
});

export type FiberColor = typeof fiberColors.$inferSelect;

// ─── Cable Modules & Fibers ───────────────────────────────────────────────────────────────────────────────────────

// Модули внутри шаблона кабеля (трубки)
export const cableModules = mysqlTable("cable_modules", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("template_id").notNull(),
  moduleNumber: int("module_number").notNull(),       // Номер модуля
  colorId: int("color_id"),                           // Цвет трубки
  fiberCount: int("fiber_count").notNull(),           // Кол-во волокон в модуле
  description: varchar("description", { length: 255 }),
});

export type CableModule = typeof cableModules.$inferSelect;
export type InsertCableModule = typeof cableModules.$inferInsert;

// Волокна внутри модуля
export const cableFibers = mysqlTable("cable_fibers", {
  id: int("id").autoincrement().primaryKey(),
  moduleId: int("module_id").notNull(),
  fiberNumber: int("fiber_number").notNull(),         // Номер волокна в модуле
  colorId: int("color_id"),                           // Цвет волокна
  fiberType: mysqlEnum("fiber_type", ["G.652D", "G.657A1", "G.657A2", "OM3", "OM4"]).default("G.652D"),
  description: varchar("description", { length: 255 }),
});

export type CableFiber = typeof cableFibers.$inferSelect;
export type InsertCableFiber = typeof cableFibers.$inferInsert;

// ─── Splice Closures & Fiber Splices ───────────────────────────────────────────────────────────────────────────────

// Муфта (привязана к map_point типа splice)
export const spliceClosures = mysqlTable("splice_closures", {
  id: int("id").autoincrement().primaryKey(),
  mapPointId: int("map_point_id").notNull(),           // Связь с объектом на карте
  name: varchar("name", { length: 255 }),
  closureType: mysqlEnum("closure_type", ["inline", "branch", "terminal"]).default("inline"),
  capacity: int("capacity").default(24),              // Макс. кол-во сварок
  manufacturer: varchar("manufacturer", { length: 255 }),
  model: varchar("model", { length: 255 }),
  installDate: timestamp("install_date"),
  description: text("description"),
  createdBy: int("created_by"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SpliceClosure = typeof spliceClosures.$inferSelect;
export type InsertSpliceClosure = typeof spliceClosures.$inferInsert;

// Сварка волокон в муфте
export const fiberSplices = mysqlTable("fiber_splices", {
  id: int("id").autoincrement().primaryKey(),
  closureId: int("closure_id").notNull(),
  // Приходящее волокно
  cableAId: int("cable_a_id"),                        // ID кабеля A
  moduleANumber: int("module_a_number"),              // Номер модуля A
  fiberANumber: int("fiber_a_number"),                // Номер волокна A
  // Исходящее волокно
  cableBId: int("cable_b_id"),                        // ID кабеля B
  moduleBNumber: int("module_b_number"),              // Номер модуля B
  fiberBNumber: int("fiber_b_number"),                // Номер волокна B
  spliceType: mysqlEnum("splice_type", ["fusion", "mechanical"]).default("fusion"),
  loss: decimal("loss", { precision: 5, scale: 3 }), // Потери в дБ
  notes: text("notes"),
  sortOrder: int("sort_order").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FiberSplice = typeof fiberSplices.$inferSelect;
export type InsertFiberSplice = typeof fiberSplices.$inferInsert;

// ─── Optical Crosses (ODF) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

// ─── Optical Crosses (ODF) ─────────────────────────────────────────────────
// Оптический кросс (ODF) — привязан к map_point типа node_district / node_main / building
export const opticalCrosses = mysqlTable("optical_crosses", {
  id: int("id").autoincrement().primaryKey(),
  mapPointId: int("map_point_id").notNull(),          // Связь с объектом на карте
  name: varchar("name", { length: 255 }).notNull(),   // Название, напр. "ОКС-1"
  crossType: mysqlEnum("cross_type", ["ODF", "ШКОС", "МОКС", "other"]).default("ODF"),
  portCount: int("port_count").default(24).notNull(), // Общее кол-во портов
  manufacturer: varchar("manufacturer", { length: 255 }),
  model: varchar("model", { length: 255 }),
  description: text("description"),
  createdBy: int("created_by"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OpticalCross = typeof opticalCrosses.$inferSelect;
export type InsertOpticalCross = typeof opticalCrosses.$inferInsert;

// Порты оптического кросса
export const crossPorts = mysqlTable("cross_ports", {
  id: int("id").autoincrement().primaryKey(),
  crossId: int("cross_id").notNull(),                 // Связь с кроссом
  portNumber: int("port_number").notNull(),            // Номер порта (1..N)
  portSide: mysqlEnum("port_side", ["line", "subscriber"]).default("line"), // Линейная / абонентская
  cableId: int("cable_id"),                            // Подключённый кабель (map_line)
  moduleNumber: int("module_number"),                  // Номер модуля кабеля
  fiberNumber: int("fiber_number"),                    // Номер волокна в модуле
  colorId: int("color_id"),                            // Цвет волокна (IEC 60304)
  status: mysqlEnum("status", ["free", "used", "reserved", "faulty"]).default("free"),
  notes: varchar("notes", { length: 255 }),
});

export type CrossPort = typeof crossPorts.$inferSelect;
export type InsertCrossPort = typeof crossPorts.$inferInsert;

// Коммутации между портами (патч-корды / пигтейлы внутри кросса)
export const portConnections = mysqlTable("port_connections", {
  id: int("id").autoincrement().primaryKey(),
  crossId: int("cross_id").notNull(),
  portAId: int("port_a_id").notNull(),                 // Линейный порт
  portBId: int("port_b_id").notNull(),                 // Абонентский порт
  connectorType: mysqlEnum("connector_type", ["SC", "LC", "FC", "ST", "E2000"]).default("SC"),
  loss: decimal("loss", { precision: 5, scale: 3 }),  // Потери в дБ
  notes: varchar("notes", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PortConnection = typeof portConnections.$inferSelect;
export type InsertPortConnection = typeof portConnections.$inferInsert;
