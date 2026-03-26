import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createBuilding,
  createCable,
  createMapPoint,
  createPublicToken,
  createRegion,
  deleteBuilding,
  deleteCable,
  deleteMapPoint,
  deletePublicToken,
  getAuditLog,
  getBuildingById,
  getBuildingsInBounds,
  getCableById,
  getCablesInBounds,
  createCableTemplate,
  getCableTemplates,
  getMapPointById,
  getMapPointsInBounds,
  getPublicTokens,
  getRecentAuditLog,
  getRegionById,
  getRegions,
  getAllUsers,
  updateBuilding,
  updateCable,
  updateMapPoint,
  updateRegion,
  updateUserRole,
  validatePublicToken,
  searchMapPoints,
  getFiberColors,
  getModulesByTemplate,
  getFibersByModule,
  upsertCableModule,
  deleteCableModule,
  upsertCableFiber,
  deleteCableFiber,
  getSpliceClosureByMapPoint,
  getSpliceClosureById,
  upsertSpliceClosure,
  getFiberSplicesByClosure,
  upsertFiberSplice,
  deleteFiberSplice,
  deleteSpliceClosure,
  getAllOpticalCrosses,
  getOpticalCrossesByMapPoint,
  getOpticalCrossById,
  upsertOpticalCross,
  deleteOpticalCross,
  getCrossPortsByCross,
  upsertCrossPort,
  deleteCrossPort,
  getPortConnectionsByCross,
  upsertPortConnection,
  deletePortConnection,
  traceFiber,
} from "./db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

const editorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role === "viewer") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Edit access required" });
  }
  return next({ ctx });
});

// Bounding box input schema
const boundsInput = z.object({
  regionId: z.number().int().positive(),
  minLat: z.number(),
  minLng: z.number(),
  maxLat: z.number(),
  maxLng: z.number(),
});

// ─── Routers ──────────────────────────────────────────────────────────────────

const regionsRouter = router({
  list: publicProcedure.query(async () => getRegions()),

  byId: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
    getRegionById(input.id)
  ),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        centerLat: z.number(),
        centerLng: z.number(),
        defaultZoom: z.number().int().min(1).max(20).default(13),
        bboxMinLat: z.number().optional(),
        bboxMinLng: z.number().optional(),
        bboxMaxLat: z.number().optional(),
        bboxMaxLng: z.number().optional(),
      })
    )
    .mutation(({ input }) =>
      createRegion({
        ...input,
        centerLat: String(input.centerLat),
        centerLng: String(input.centerLng),
        bboxMinLat: input.bboxMinLat !== undefined ? String(input.bboxMinLat) : undefined,
        bboxMinLng: input.bboxMinLng !== undefined ? String(input.bboxMinLng) : undefined,
        bboxMaxLat: input.bboxMaxLat !== undefined ? String(input.bboxMaxLat) : undefined,
        bboxMaxLng: input.bboxMaxLng !== undefined ? String(input.bboxMaxLng) : undefined,
      })
    ),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        centerLat: z.number().optional(),
        centerLng: z.number().optional(),
        defaultZoom: z.number().int().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(({ input }) => {
      const { id, centerLat, centerLng, ...rest } = input;
      return updateRegion(id, {
        ...rest,
        ...(centerLat !== undefined ? { centerLat: String(centerLat) } : {}),
        ...(centerLng !== undefined ? { centerLng: String(centerLng) } : {}),
      });
    }),
});

const mapPointsRouter = router({
  inBounds: protectedProcedure.input(boundsInput).query(({ input }) =>
    getMapPointsInBounds(input.regionId, input.minLat, input.minLng, input.maxLat, input.maxLng)
  ),

  byId: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
    getMapPointById(input.id)
  ),

  create: editorProcedure
    .input(
      z.object({
        regionId: z.number().int().positive(),
        lat: z.number(),
        lng: z.number(),
        type: z.enum(["pole", "manhole", "splice", "mast", "entry_point", "node_district", "node_trunk", "flag", "camera", "other"]),
        status: z.enum(["plan", "fact", "dismantled"]).default("fact"),
        name: z.string().optional(),
        description: z.string().optional(),
        address: z.string().optional(),
        attributes: z.record(z.string(), z.unknown()).optional(),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(({ input, ctx }) =>
      createMapPoint(
        { ...input, lat: String(input.lat), lng: String(input.lng), attributes: input.attributes as any },
        ctx.user.id,
        ctx.user.name ?? "Unknown"
      )
    ),

  update: editorProcedure
    .input(
      z.object({
        id: z.number(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        type: z.enum(["pole", "manhole", "splice", "mast", "entry_point", "node_district", "node_trunk", "flag", "camera", "other"]).optional(),
        status: z.enum(["plan", "fact", "dismantled"]).optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        address: z.string().optional(),
        attributes: z.record(z.string(), z.unknown()).optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      const { id, lat, lng, ...rest } = input;
      return updateMapPoint(
        id,
        {
          ...rest,
          ...(lat !== undefined ? { lat: String(lat) } : {}),
          ...(lng !== undefined ? { lng: String(lng) } : {}),
          attributes: rest.attributes as any,
        },
        ctx.user.id,
        ctx.user.name ?? "Unknown"
      );
    }),

  delete: editorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) =>
      deleteMapPoint(input.id, ctx.user.id, ctx.user.name ?? "Unknown")
    ),
  search: protectedProcedure
    .input(z.object({ regionId: z.number(), query: z.string().min(2).max(100) }))
    .query(({ input }) => searchMapPoints(input.regionId, input.query)),
});

const cablesRouter = router({
  inBounds: protectedProcedure.input(boundsInput).query(({ input }) =>
    getCablesInBounds(input.regionId, input.minLat, input.minLng, input.maxLat, input.maxLng)
  ),

  byId: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
    getCableById(input.id)
  ),

  templates: protectedProcedure.query(async () => getCableTemplates()),

  create: editorProcedure
    .input(
      z.object({
        regionId: z.number().int().positive(),
        templateId: z.number().optional(),
        name: z.string().optional(),
        status: z.enum(["plan", "fact", "dismantled"]).default("fact"),
        layingType: z.enum(["aerial", "underground", "duct", "building"]).default("aerial"),
        route: z.array(z.object({ lat: z.number(), lng: z.number() })).min(2),
        lengthFact: z.number().optional(),
        description: z.string().optional(),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(({ input, ctx }) => {
      const lats = input.route.map((p) => p.lat);
      const lngs = input.route.map((p) => p.lng);
      // Calculate length using Haversine
      let lengthCalc = 0;
      for (let i = 1; i < input.route.length; i++) {
        lengthCalc += haversine(input.route[i - 1], input.route[i]);
      }
      return createCable(
        {
          ...input,
          route: input.route as any,
          lengthCalc: String(Math.round(lengthCalc)),
          lengthFact: input.lengthFact !== undefined ? String(input.lengthFact) : undefined,
          bboxMinLat: String(Math.min(...lats)),
          bboxMinLng: String(Math.min(...lngs)),
          bboxMaxLat: String(Math.max(...lats)),
          bboxMaxLng: String(Math.max(...lngs)),
        },
        ctx.user.id,
        ctx.user.name ?? "Unknown"
      );
    }),

  update: editorProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        status: z.enum(["plan", "fact", "dismantled"]).optional(),
        layingType: z.enum(["aerial", "underground", "duct", "building"]).optional(),
        route: z.array(z.object({ lat: z.number(), lng: z.number() })).min(2).optional(),
        lengthFact: z.number().optional(),
        description: z.string().optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      const { id, route, lengthFact, ...rest } = input;
      const updates: Record<string, unknown> = { ...rest };
      if (route) {
        const lats = route.map((p) => p.lat);
        const lngs = route.map((p) => p.lng);
        let lengthCalc = 0;
        for (let i = 1; i < route.length; i++) lengthCalc += haversine(route[i - 1], route[i]);
        updates.route = route;
        updates.lengthCalc = String(Math.round(lengthCalc));
        updates.bboxMinLat = String(Math.min(...lats));
        updates.bboxMinLng = String(Math.min(...lngs));
        updates.bboxMaxLat = String(Math.max(...lats));
        updates.bboxMaxLng = String(Math.max(...lngs));
      }
      if (lengthFact !== undefined) updates.lengthFact = String(lengthFact);
      return updateCable(id, updates as any, ctx.user.id, ctx.user.name ?? "Unknown");
    }),

  delete: editorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) =>
      deleteCable(input.id, ctx.user.id, ctx.user.name ?? "Unknown")
    ),
});

const buildingsRouter = router({
  inBounds: protectedProcedure.input(boundsInput).query(({ input }) =>
    getBuildingsInBounds(input.regionId, input.minLat, input.minLng, input.maxLat, input.maxLng)
  ),

  byId: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
    getBuildingById(input.id)
  ),

  create: editorProcedure
    .input(
      z.object({
        regionId: z.number().int().positive(),
        name: z.string().optional(),
        address: z.string().optional(),
        polygon: z.array(z.object({ lat: z.number(), lng: z.number() })).min(3),
        floors: z.number().int().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      const lats = input.polygon.map((p) => p.lat);
      const lngs = input.polygon.map((p) => p.lng);
      const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
      return createBuilding(
        {
          ...input,
          polygon: input.polygon as any,
          centerLat: String(centerLat),
          centerLng: String(centerLng),
          bboxMinLat: String(Math.min(...lats)),
          bboxMinLng: String(Math.min(...lngs)),
          bboxMaxLat: String(Math.max(...lats)),
          bboxMaxLng: String(Math.max(...lngs)),
        },
        ctx.user.id,
        ctx.user.name ?? "Unknown"
      );
    }),

  update: editorProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        address: z.string().optional(),
        floors: z.number().int().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      const { id, ...rest } = input;
      return updateBuilding(id, rest, ctx.user.id, ctx.user.name ?? "Unknown");
    }),

  delete: editorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) =>
      deleteBuilding(input.id, ctx.user.id, ctx.user.name ?? "Unknown")
    ),
});

const auditRouter = router({
  forObject: protectedProcedure
    .input(z.object({ tableName: z.string(), objectId: z.number() }))
    .query(({ input }) => getAuditLog(input.tableName, input.objectId)),

  recent: adminProcedure
    .input(z.object({ limit: z.number().int().max(200).default(100) }))
    .query(({ input }) => getRecentAuditLog(input.limit)),
});

const publicMapRouter = router({
  validate: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(({ input }) => validatePublicToken(input.token)),

  mapData: publicProcedure
    .input(
      z.object({
        token: z.string(),
        regionId: z.number(),
        minLat: z.number(),
        minLng: z.number(),
        maxLat: z.number(),
        maxLng: z.number(),
      })
    )
    .query(async ({ input }) => {
      const tokenData = await validatePublicToken(input.token);
      if (!tokenData) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired token" });
      if (tokenData.regionId && tokenData.regionId !== input.regionId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Token not valid for this region" });
      }
      const [points, cableList] = await Promise.all([
        getMapPointsInBounds(input.regionId, input.minLat, input.minLng, input.maxLat, input.maxLng),
        getCablesInBounds(input.regionId, input.minLat, input.minLng, input.maxLat, input.maxLng),
      ]);
      return {
        points: points.filter((p) => p.isPublic),
        cables: cableList.filter((c) => c.isPublic),
        region: await getRegionById(input.regionId),
      };
    }),

  tokens: adminProcedure.query(() => getPublicTokens()),

  createToken: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        regionId: z.number().optional(),
        allowedLayers: z.array(z.string()).optional(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(({ input, ctx }) =>
      createPublicToken({
        ...input,
        token: nanoid(32),
        allowedLayers: input.allowedLayers as any,
        createdBy: ctx.user.id,
      })
    ),

   deleteToken: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deletePublicToken(input.id)),
});

// ─── Fiber Colors Router ─────────────────────────────────────────────────────

const fiberColorsRouter = router({
  list: publicProcedure.query(() => getFiberColors()),
});

// ─── Cable Modules Router ─────────────────────────────────────────────────────

const cableModulesRouter = router({
  byTemplate: protectedProcedure
    .input(z.object({ templateId: z.number().int().positive() }))
    .query(({ input }) => getModulesByTemplate(input.templateId)),

  fibersByModule: protectedProcedure
    .input(z.object({ moduleId: z.number().int().positive() }))
    .query(({ input }) => getFibersByModule(input.moduleId)),

  upsertModule: editorProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        templateId: z.number().int().positive(),
        moduleNumber: z.number().int().positive(),
        colorId: z.number().int().positive().nullable().optional(),
        fiberCount: z.number().int().min(1).max(144),
        description: z.string().max(255).nullable().optional(),
      })
    )
    .mutation(({ input }) => upsertCableModule(input)),

  deleteModule: editorProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => deleteCableModule(input.id)),

  upsertFiber: editorProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        moduleId: z.number().int().positive(),
        fiberNumber: z.number().int().positive(),
        colorId: z.number().int().positive().nullable().optional(),
        fiberType: z.enum(["G.652D", "G.657A1", "G.657A2", "OM3", "OM4"]).optional(),
        description: z.string().max(255).nullable().optional(),
      })
    )
    .mutation(({ input }) => upsertCableFiber(input)),

  deleteFiber: editorProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => deleteCableFiber(input.id)),
});

// ─── Splice Closures Router ───────────────────────────────────────────────────

const spliceRouter = router({
  byMapPoint: protectedProcedure
    .input(z.object({ mapPointId: z.number().int().positive() }))
    .query(({ input }) => getSpliceClosureByMapPoint(input.mapPointId)),

  byId: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ input }) => getSpliceClosureById(input.id)),

  upsert: editorProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        mapPointId: z.number().int().positive(),
        name: z.string().max(255).nullable().optional(),
        closureType: z.enum(["inline", "branch", "terminal"]).optional(),
        capacity: z.number().int().min(1).max(9999).optional(),
        manufacturer: z.string().max(255).nullable().optional(),
        model: z.string().max(255).nullable().optional(),
        description: z.string().nullable().optional(),
      })
    )
    .mutation(({ input, ctx }) =>
      upsertSpliceClosure({ ...input, createdBy: ctx.user.id })
    ),

  delete: editorProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => deleteSpliceClosure(input.id)),

  splices: protectedProcedure
    .input(z.object({ closureId: z.number().int().positive() }))
    .query(({ input }) => getFiberSplicesByClosure(input.closureId)),

  upsertSplice: editorProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        closureId: z.number().int().positive(),
        cableAId: z.number().int().positive().nullable().optional(),
        moduleANumber: z.number().int().positive().nullable().optional(),
        fiberANumber: z.number().int().positive().nullable().optional(),
        cableBId: z.number().int().positive().nullable().optional(),
        moduleBNumber: z.number().int().positive().nullable().optional(),
        fiberBNumber: z.number().int().positive().nullable().optional(),
        spliceType: z.enum(["fusion", "mechanical"]).optional(),
        loss: z.string().max(10).nullable().optional(),
        notes: z.string().nullable().optional(),
        sortOrder: z.number().int().min(0).optional(),
      })
    )
    .mutation(({ input }) => upsertFiberSplice(input)),

  deleteSplice: editorProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => deleteFiberSplice(input.id)),
});

// ─── Optical Cross Router ───────────────────────────────────────────────────

const opticalCrossRouter = router({
  list: publicProcedure.query(() => getAllOpticalCrosses()),

  byMapPoint: publicProcedure
    .input(z.object({ mapPointId: z.number().int().positive() }))
    .query(({ input }) => getOpticalCrossesByMapPoint(input.mapPointId)),

  byId: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ input }) => getOpticalCrossById(input.id)),

  upsert: editorProcedure
    .input(z.object({
      id: z.number().int().positive().optional(),
      mapPointId: z.number().int().positive(),
      name: z.string().min(1).max(255),
      crossType: z.enum(["ODF", "ШКОС", "МОКС", "other"]).optional(),
      portCount: z.number().int().min(1).max(1000).optional(),
      manufacturer: z.string().max(255).optional(),
      model: z.string().max(255).optional(),
      description: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => upsertOpticalCross({ ...input, createdBy: ctx.user.id })),

  delete: editorProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => deleteOpticalCross(input.id)),

  // ─── Ports ─────────────────────────────────────────────────────────────
  ports: publicProcedure
    .input(z.object({ crossId: z.number().int().positive() }))
    .query(({ input }) => getCrossPortsByCross(input.crossId)),

  upsertPort: editorProcedure
    .input(z.object({
      id: z.number().int().positive().optional(),
      crossId: z.number().int().positive(),
      portNumber: z.number().int().min(1),
      portSide: z.enum(["line", "subscriber"]).optional(),
      cableId: z.number().int().positive().optional().nullable(),
      moduleNumber: z.number().int().min(1).optional().nullable(),
      fiberNumber: z.number().int().min(1).optional().nullable(),
      colorId: z.number().int().positive().optional().nullable(),
      status: z.enum(["free", "used", "reserved", "faulty"]).optional(),
      notes: z.string().max(255).optional().nullable(),
    }))
    .mutation(({ input }) => upsertCrossPort(input)),

  deletePort: editorProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => deleteCrossPort(input.id)),

  // ─── Connections ────────────────────────────────────────────────────────
  connections: publicProcedure
    .input(z.object({ crossId: z.number().int().positive() }))
    .query(({ input }) => getPortConnectionsByCross(input.crossId)),

  upsertConnection: editorProcedure
    .input(z.object({
      id: z.number().int().positive().optional(),
      crossId: z.number().int().positive(),
      portAId: z.number().int().positive(),
      portBId: z.number().int().positive(),
      connectorType: z.enum(["SC", "LC", "FC", "ST", "E2000"]).optional(),
      loss: z.string().optional().nullable(),
      notes: z.string().max(255).optional().nullable(),
    }))
    .mutation(({ input }) => upsertPortConnection(input)),

  deleteConnection: editorProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => deletePortConnection(input.id)),
});

// ─── Fiber Trace Router ───────────────────────────────────────────────────

const fiberTraceRouter = router({
  trace: publicProcedure
    .input(z.object({
      cableId: z.number().int().positive(),
      moduleNumber: z.number().int().min(1),
      fiberNumber: z.number().int().min(1),
    }))
    .query(({ input }) => traceFiber(input.cableId, input.moduleNumber, input.fiberNumber)),
});

const adminRouter = router({
  users: adminProcedure.query(() => getAllUsers()),
  updateUserRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "viewer"]) }))
    .mutation(({ input }) => updateUserRole(input.userId, input.role)),
  createCableTemplate: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      fiberCount: z.number().min(1).max(1000),
      description: z.string().optional(),
    }))
    .mutation(({ input }) => createCableTemplate(input)),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  regions: regionsRouter,
  mapPoints: mapPointsRouter,
  cables: cablesRouter,
  buildings: buildingsRouter,
  audit: auditRouter,
  publicMap: publicMapRouter,
  admin: adminRouter,
  fiberColors: fiberColorsRouter,
  cableModules: cableModulesRouter,
  splice: spliceRouter,
  opticalCross: opticalCrossRouter,
  fiberTrace: fiberTraceRouter,
});

export type AppRouter = typeof appRouter;

// ─── Utility ──────────────────────────────────────────────────────────────────

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
