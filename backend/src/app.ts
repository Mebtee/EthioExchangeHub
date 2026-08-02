import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";

import { HEALTH_PATH, REQUEST_BODY_LIMIT } from "./constants";
import { env } from "./utils/validate-env";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { logStream } from "./lib/logger";
import { verifyDatabaseConnection } from "./lib/supabase";
import { errorResponse, successResponse } from "./utils/api-response";

/**
 * Builds and returns the Express application.
 *
 * Registers GLOBAL middleware and the health check (which since Phase 2A also
 * verifies Supabase connectivity). No business routes, auth, or repositories
 * yet — those mount here in later phases (e.g. `app.use('/api/v1', apiRouter)`
 * once routes exist).
 */
export function createApp(): Express {
  const app = express();

  // ---- Security ----
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  // ---- CORS ----
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );

  // ---- Performance ----
  app.use(compression());

  // ---- Body parsing ----
  app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));

  // ---- Cookies ----
  app.use(cookieParser());

  // ---- Logging ----
  app.use(morgan("combined", { stream: logStream }));

  // ---- Health check ----
  // Phase 2A: reports server + database connectivity. `verifyDatabaseConnection`
  // never throws (Supabase failures are wrapped in DatabaseError and logged), so
  // the handler cannot reject; it responds with the standard envelope either way.
  app.get(HEALTH_PATH, async (_req, res) => {
    const databaseConnected = await verifyDatabaseConnection();
    if (!databaseConnected) {
      errorResponse(res, "Database connection failed.", 503);
      return;
    }
    successResponse(
      res,
      { server: "OK", database: "Connected" },
      "Server and database are healthy.",
    );
  });

  // ---- 404 + error handling (registered last, in order) ----
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
