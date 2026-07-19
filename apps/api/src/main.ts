import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as helmet from 'helmet';
import * as compression from 'compression';
import * as morgan from 'morgan';

import { AppModule } from './app.module';
import { MonitoringService } from './monitoring/monitoring.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // ── Trust Proxy (for Cloudflare, reverse proxy environments) ──
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // ── Compression (gzip/brotli) ─────────────────────────────────
  app.use(
    compression.default({
      level: 6,
      threshold: 1024, // Only compress responses > 1KB
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.default.filter(req, res);
      },
    }),
  );

  // ── Security: Helmet with strict CSP ──────────────────────────
  app.use(
    helmet.default({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: ["'self'", 'https://api.telegram.org'],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // ── Request Logging (structured) ─────────────────────────────
  app.use(
    morgan(':method :url :status :response-time ms - :res[content-length]', {
      stream: {
        write: (message: string) => {
          logger.log(message.trim());
        },
      },
    }),
  );

  // ── CORS (Cloudflare-ready) ────────────────────────────────────
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  app.enableCors({
    origin: corsOrigins.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
    maxAge: 86400, // Preflight cache for 24h (Cloudflare optimization)
  });

  // ── Global Validation Pipe ────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      disableErrorMessages: process.env['NODE_ENV'] === 'production',
    }),
  );

  // ── API Versioning ───────────────────────────────────────────
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ── Global Prefix ────────────────────────────────────────────
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // ── Swagger / OpenAPI ────────────────────────────────────────
  if (process.env['NODE_ENV'] !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('EthioBanksHub API')
      .setDescription('Unified banking interface for Ethiopian banks')
      .setVersion('1.0')
      .addBearerAuth()
      .addServer(`http://localhost:${configService.get('port', 4000)}`)
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  // ── Monitoring / Request Timing Interceptor ───────────────────
  const monitoringService = app.get(MonitoringService);
  app.use((req: any, res: any, next: any) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const path = req.originalUrl ?? req.url;
      monitoringService.recordRequestTiming(path, duration);
      if (res.statusCode >= 400) {
        monitoringService.recordError(`${res.statusCode}`);
      }
    });
    next();
  });

  // ── Start Server ─────────────────────────────────────────────
  const port = configService.get<number>('port', 4000);
  await app.listen(port);

  logger.log(`🚀 API running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`📖 API docs at http://localhost:${port}/docs`);
  logger.log(`🌐 CORS enabled for: ${corsOrigins}`);
  logger.log(`🛡️ Helmet CSP enabled`);
  logger.log(`📦 Compression enabled`);
  logger.log(`⚡ Redis cache: ${configService.get<string>('redis.url', 'redis://localhost:6379')}`);
}

bootstrap();
