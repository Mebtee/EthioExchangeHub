import { createServer, type Server } from "node:http";

import { createApp } from "./app";
import { logger } from "./lib/logger";
import { env } from "./utils/validate-env";

/**
 * Logs the startup configuration — SAFE values only. Secrets (SUPABASE URL /
 * service-role key, JWT secret) are NEVER logged; only booleans/safe settings
 * that aid operations and incident response are emitted.
 */
function logStartupConfiguration(): void {
  logger.info("Startup configuration", {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    frontendOrigin: env.FRONTEND_URL,
    // Derived, never the values themselves: boot only succeeds when these are
    // present (validate-env fails fast), so this is always true — but derived
    // from the actual config rather than hardcoded.
    supabaseConfigured: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
    jwtConfigured: Boolean(env.JWT_SECRET),
  });
}

/**
 * Boots the HTTP server.
 *
 * Phase 1: plain HTTP. Later phases that need WebSocket support (e.g. live rate
 * streaming) will swap `createServer` for a WebSocket-aware server here.
 */
export function startServer(): Server {
  const app = createApp();
  const server = createServer(app);

  server.listen(env.PORT, () => {
    logger.info(`Server listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    logStartupConfiguration();
  });

  return server;
}
