import "dotenv/config"; // load .env before utils/validate-env.ts validates it

import { startServer } from "./server";
import { logger } from "./lib/logger";

/**
 * Process entry point.
 *
 * Starts the server and wires graceful shutdown so in-flight requests can
 * finish before the process exits (SIGINT = Ctrl+C, SIGTERM = deployment tools).
 */
const server = startServer();

function shutdown(signal: NodeJS.Signals): void {
  logger.info(`${signal} received, shutting down gracefully...`);

  server.close((err) => {
    if (err) {
      logger.error("Error during shutdown", { error: err.message });
      process.exit(1);
    }
    logger.info("Server closed. Goodbye.");
    process.exit(0);
  });

  // Hard-exit if shutdown takes too long (e.g. a stuck request).
  setTimeout(() => {
    logger.warn("Forced shutdown after timeout.");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason });
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { error: err.message, stack: err.stack });
  process.exit(1);
});
