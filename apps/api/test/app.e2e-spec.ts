import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('App (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('GET /api/v1/health/live should return alive status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/live')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'alive');
          expect(res.body).toHaveProperty('timestamp');
        });
    });

    it('GET /api/v1/health/ready should return ready (or degraded without DB)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('timestamp');
        });
    });

    it('GET /api/v1/health should return full health check', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('uptime');
          expect(res.body).toHaveProperty('version');
          expect(res.body).toHaveProperty('checks');
          expect(res.body.checks).toHaveProperty('database');
          expect(res.body.checks).toHaveProperty('redis');
        });
    });
  });

  describe('Metrics', () => {
    it('GET /api/v1/metrics should return system metrics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/metrics')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('uptime');
          expect(res.body).toHaveProperty('memory');
          expect(res.body.memory).toHaveProperty('rss');
          expect(res.body.memory).toHaveProperty('heapUsed');
          expect(res.body.memory).toHaveProperty('heapTotal');
          expect(res.body).toHaveProperty('requests');
          expect(res.body.requests).toHaveProperty('total');
          expect(res.body).toHaveProperty('errors');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('Exchange Rates', () => {
    it('GET /api/v1/exchange-rates/currencies should return supported currencies', () => {
      return request(app.getHttpServer())
        .get('/api/v1/exchange-rates/currencies')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('base', 'ETB');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data).toContain('USD');
        });
    });

    it('GET /api/v1/exchange-rates/latest should return paginated rates', () => {
      return request(app.getHttpServer())
        .get('/api/v1/exchange-rates/latest')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(res.body.meta).toHaveProperty('page');
          expect(res.body.meta).toHaveProperty('limit');
          expect(res.body.meta).toHaveProperty('total');
        });
    });
  });

  describe('Auth - Register & Login flow', () => {
    const testEmail = `e2e-test-${Date.now()}@example.com`;
    const testPassword = 'Test1234!';
    let accessToken: string;

    it('POST /api/v1/auth/register should create a new user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          fullName: 'E2E Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('email', testEmail);
        });
    });

    it('POST /api/v1/auth/login should authenticate existing user', async () => {
      // First register
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          fullName: 'E2E Test User',
        })
        .expect(201);

      // Then login
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          accessToken = res.body.accessToken;
        });
    });

    it('GET /api/v1/auth/profile should return user profile with valid token', async () => {
      // Register and login first
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `profile-test-${Date.now()}@example.com`,
          password: testPassword,
          fullName: 'Profile Test',
        })
        .expect(201);

      const token = loginRes.body.accessToken;

      return request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('email');
          expect(res.body).toHaveProperty('fullName');
        });
    });

    it('GET /api/v1/auth/profile should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });
  });

  describe('Protected Routes', () => {
    it('should return 401 for unauthenticated requests to protected endpoints', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .expect(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      // Make a few health check requests
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .get('/api/v1/health/live')
          .expect(200);
      }
    });
  });
});
