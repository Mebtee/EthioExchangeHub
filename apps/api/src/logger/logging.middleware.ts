import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const start = Date.now();
    const requestId = crypto.randomUUID().slice(0, 8);

    // Attach request ID for tracking
    (req as any).requestId = requestId;

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';

      this.logger[level](
        `[${requestId}] ${method} ${originalUrl} ${statusCode} ${duration}ms`,
      );
    });

    next();
  }
}

// ── Structured Logging Service ─────────────────────────────────
import * as pino from 'pino';

export const logger = pino.default({
  level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
  transport:
    process.env['NODE_ENV'] !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: true } }
      : undefined,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      requestId: req.requestId,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
});
