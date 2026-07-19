import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // ── Security ─────────────────────────────────────────────────
  app.use(helmet.default);

  // ── CORS ─────────────────────────────────────────────────────
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  app.enableCors({
    origin: corsOrigins.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Validation ───────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
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
  const swaggerConfig = new DocumentBuilder()
    .setTitle('EthioBanksHub API')
    .setDescription('Unified banking interface for Ethiopian banks')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // ── Start Server ─────────────────────────────────────────────
  const port = configService.get<number>('API_PORT', 4000);
  await app.listen(port);

  console.log(`\n🚀 API running on http://localhost:${port}/${apiPrefix}\n`);
  console.log(`📖 API docs at http://localhost:${port}/docs\n`);
}

bootstrap();
