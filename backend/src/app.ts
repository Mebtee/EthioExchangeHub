import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import {
  HEALTH_PATH,
  READY_PATH,
  LIVE_PATH,
  METRICS_PATH,
  API_PREFIX,
  REQUEST_BODY_LIMIT,
} from "./constants";
import { openApiDocument } from "./docs/openapi";
import { env } from "./utils/validate-env";
import { errorHandler } from "./middleware/error-handler";
import { metricsMiddleware } from "./middleware/metrics";
import { notFoundHandler } from "./middleware/not-found";
import { logStream, logger } from "./lib/logger";
import { renderMetrics, registry } from "./lib/metrics";
import { requestIdMiddleware } from "./middleware/request-id";
import { verifyDatabaseConnection } from "./lib/supabase";
import { apiRouter } from "./routes";
import { errorResponse, successResponse } from "./utils/api-response";

/**
 * Builds and returns the Express application.
 *
 * Registers GLOBAL middleware, the health check (which since Phase 2A also
 * verifies Supabase connectivity), and the versioned business API under
 * `/api/v1` (Phase 2F). No auth, validation, or rate-limiting middleware — the
 * routing layer only mounts controllers wired through services/repositories.
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
  // Compression is enabled globally with a 1 KB threshold (the default);
  // responses smaller than the threshold are left uncompressed. Exclusions:
  // responses already carrying `Content-Encoding`, streaming responses, and
  // content types that are already compressed (images, archives) are skipped
  // by the underlying middleware automatically. See docs/SECURITY.md.
  app.use(compression({ threshold: 1024 }));

  // ---- Body parsing ----
  app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));

  // ---- Cookies ----
  app.use(cookieParser());

  // ---- Request id (Phase 3) ----
  // Generates a UUID per request, sets the X-Request-ID response header, and
  // provides the async-local context the logger uses to tag every log line.
  // Registered before logging so access logs carry the id too.
  app.use(requestIdMiddleware);

  // ---- Metrics (Phase 2K) ----
  // Records request count/duration/status for Prometheus. Registered before
  // the access log so every request is measured. `/metrics` self-excluded.
  app.use(metricsMiddleware);

  // ---- Logging ----
  // Access log: method + path + status + duration. The logger prepends the
  // timestamp and appends the request id (from async context), so every line
  // carries: timestamp, requestId, method, path, status.
  app.use(morgan(":method :url :status :response-time ms", { stream: logStream }));

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

  // ---- Readiness probe (Phase 3) ----
  // Used by orchestrators / load balancers to decide when traffic may be
  // routed. 200 only when the database is reachable; 503 otherwise. The
  // same guarantees as /health — never throws, standard envelope either way.
  app.get(READY_PATH, async (_req, res) => {
    const databaseReady = await verifyDatabaseConnection();
    if (!databaseReady) {
      errorResponse(res, "Service not ready.", 503);
      return;
    }
    successResponse(res, { ready: true }, "Server is ready.");
  });

  // ---- Liveness probe (Phase 2K) ----
  // Kubernetes / Docker liveness check: the process is up and responding.
  // Deliberately NO database call — it answers 200 as long as the server is
  // alive, even if the database is down (readiness handles that).
  app.get(LIVE_PATH, (_req, res) => {
    successResponse(res, { alive: true }, "Server is alive.");
  });

  // ---- Metrics (Phase 2K) ----
  // Prometheus exposition endpoint. Content type set per the registry so
  // scrapers parse it correctly. Never throws in practice; a render failure
  // degrades to the standard 500 envelope.
  app.get(METRICS_PATH, async (_req, res) => {
    try {
      res.setHeader("Content-Type", registry.contentType);
      res.send(await renderMetrics());
    } catch (err) {
      logger.error("Failed to render metrics", {
        error: err instanceof Error ? err.message : String(err),
      });
      errorResponse(res, "Metrics unavailable.", 500);
    }
  });

  // ---- Versioned business API (Phase 2F) ----
  // Mounted under `/api/v1`; future API versions can add their own prefix
  // without touching controllers. Registered before the 404/error handlers.
  app.use(API_PREFIX, apiRouter);

  // ---- API documentation (Phase 2H) ----
  // Swagger UI renders the OpenAPI 3.1 document; `/docs.json` serves the raw
  // document for tooling. The document describes the code, never the reverse.
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get("/docs.json", (_req, res) => {
    res.json(openApiDocument);
  });

  // ---- 404 + error handling (registered last, in order) ----
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
