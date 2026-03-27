// OAuth routes replaced by local email/password auth via tRPC
// This file is kept for compatibility but no longer registers OAuth routes.
import type { Express } from "express";

export function registerOAuthRoutes(_app: Express) {
  // No-op: authentication is now handled via tRPC procedures in routers.ts
}
