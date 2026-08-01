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
import { successResponse } from "./utils/api-response";

/**
 * Builds and returns the Express application.
 *
 * Phase 1 registers GLOBAL middleware and the health check ONLY.
 * No business routes, auth, or repositories yet — those mount here in later phases
 * (e.g. `app.use('/api/v1', apiRouter)` once routes exist).
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
  app.get(HEALTH_PATH, (_req, res) => {
    successResponse(res, { status: "OK" }, "Server is healthy.");
  });

  // ---- 404 + error handling (registered last, in order) ----
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
