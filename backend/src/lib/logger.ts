import { AsyncLocalStorage } from "node:async_hooks";

import { env } from "@/utils/validate-env";

type LogLevel = "fatal" | "error" | "warn" | "info" | "http" | "debug";

const LEVEL_RANK: Record<LogLevel, number> = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  http: 4,
  debug: 5,
};

/**
 * Per-request async context. `middleware/request-id.ts` runs every request
 * inside this store, so ANY logger call while handling it — from the route
 * handler, a service, or the error middleware — automatically carries the
 * request id without threading it through call signatures.
 */
export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

/** Returns the request id for the current request context, if any. */
export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

/** Effective log level, read live so it can be tuned per environment/profile. */
function configuredLevel(): LogLevel {
  return (env.LOG_LEVEL as LogLevel) ?? "info";
}

/** Formats a message (and optional structured context) into one log line. */
function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const tag = level.toUpperCase().padEnd(5);
  const requestId = getRequestId();
  const requestIdPart = requestId ? ` [requestId=${requestId}]` : "";
  const metaSuffix = meta === undefined ? "" : ` ${JSON.stringify(meta)}`;
  return `[${timestamp}] ${tag}${requestIdPart} ${message}${metaSuffix}`;
}

/** Writes a single formatted line to the correct stream. */
function write(level: LogLevel, stream: NodeJS.WriteStream, message: string, meta?: unknown): void {
  if (LEVEL_RANK[level] > LEVEL_RANK[configuredLevel()]) return;
  stream.write(formatMessage(level, message, meta) + "\n");
}

/**
 * Minimal structured logger. The whole project logs through this module —
 * raw `console.log` calls are not used elsewhere. `fatal`/`error` go to
 * stderr, everything else to stdout. The active level comes from
 * `LOG_LEVEL` (defaults to `info`).
 */
export const logger = {
  fatal(message: string, meta?: unknown): void {
    write("fatal", process.stderr, message, meta);
  },
  error(message: string, meta?: unknown): void {
    write("error", process.stderr, message, meta);
  },
  warn(message: string, meta?: unknown): void {
    write("warn", process.stdout, message, meta);
  },
  info(message: string, meta?: unknown): void {
    write("info", process.stdout, message, meta);
  },
  /** HTTP access logs (morgan). */
  http(message: string, meta?: unknown): void {
    write("http", process.stdout, message, meta);
  },
  debug(message: string, meta?: unknown): void {
    write("debug", process.stdout, message, meta);
  },
};

/** Morgan-compatible stream so HTTP access logs flow through the logger. */
export const logStream = {
  write(message: string): void {
    const trimmed = message.trimEnd();
    if (trimmed) logger.http(trimmed);
  },
};
