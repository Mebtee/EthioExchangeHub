import { createServer, type Server } from "node:http";

import { createApp } from "./app";
import { logger } from "./lib/logger";
import { env } from "./utils/validate-env";

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
  });

  return server;
}
