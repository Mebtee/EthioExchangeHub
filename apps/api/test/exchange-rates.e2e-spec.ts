import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Exchange Rates (E2E)', () => {
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

  describe('GET /api/v1/exchange-rates/latest', () => {
    it('should return 200 with paginated rates', () => {
      return request(app.getHttpServer())
        .get('/api/v1/exchange-rates/latest')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body).toHaveProperty('meta');
          expect(res.body.meta).toHaveProperty('page', 1);
          expect(res.body.meta).toHaveProperty('limit', 20);
          expect(res.body.meta).toHaveProperty('total');
          expect(res.body.meta).toHaveProperty('totalPages');
        });
    });

    it('should filter by currency', () => {
      return request(app.getHttpServer())
        .get('/api/v1/exchange-rates/latest?currencyTo=USD')
        .expect(200)
        .expect((res) => {
          if (res.body.data.length > 0) {
            res.body.data.forEach((rate: any) => {
              expect(rate.currencyTo).toBe('USD');
            });
          }
        });
    });

    it('should filter by bank code', () => {
      return request(app.getHttpServer())
        .get('/api/v1/exchange-rates/latest?bankCode=CBE')
        .expect(200);
    });

    it('should paginate results', () => {
      return request(app.getHttpServer())
        .get('/api/v1/exchange-rates/latest?page=1&limit=5')
        .expect(200)
        .expect((res) => {
          expect(res.body.meta).toHaveProperty('page', 1);
          expect(res.body.meta).toHaveProperty('limit', 5);
        });
    });

    it('should return 400 for invalid parameters', () => {
      return request(app.getHttpServer())
        .get('/api/v1/exchange-rates/latest?page=-1')
        .expect(400);
    });

    it('should sort by buy rate ascending', () => {
      return request(app.getHttpServer())
        .get('/api/v1/exchange-rates/latest?sortBy=buyRate&sortOrder=asc')
        .expect(200);
    });
  });

  describe('GET /api/v1/exchange-rates/historical', () => {
    it('should return 200 with historical data', () => {
      return request(app.getHttpServer())
        .get('/api/v1/exchange-rates/historical')
        .expect(200);
    });

    it('should filter by date range', () => {
      return request(app.getHttpServer())
        .get('/api/v1/exchange-rates/historical?fromDate=2024-01-01&toDate=2024-12-31')
        .expect(200);
    });
  });

  describe('GET /api/v1/exchange-rates/compare', () => {
    it('should compare rates across banks', () => {
      return request(app.getHttpServer())
        .get('/api/v1/exchange-rates/compare?currencyTo=USD')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('banks');
          expect(Array.isArray(res.body.banks)).toBe(true);
          expect(res.body).toHaveProperty('summary');
          expect(res.body).toHaveProperty('currencyTo');
        });
    });
  });

  describe('GET /api/v1/exchange-rates/best', () => {
    it('should return best buy rates', () => {
      return request(app.getHttpServer())
        .get('/api/v1/exchange-rates/best?currencyTo=USD&type=buy')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('best');
          expect(res.body).toHaveProperty('average');
          expect(res.body).toHaveProperty('totalBanks');
        });
    });
  });

  describe('GET /api/v1/exchange-rates/export/csv', () => {
    it('should generate CSV file', () => {
      return request(app.getHttpServer())
        .get('/api/v1/exchange-rates/export/csv')
        .expect(200)
        .expect('Content-Type', /text\/csv/)
        .expect((res) => {
          expect(res.text).toContain('Bank,Currency,Buy Rate,Sell Rate');
        });
    });
  });

  describe('GET /api/v1/exchange-rates/export/pdf', () => {
    it('should generate PDF report', () => {
      return request(app.getHttpServer())
        .get('/api/v1/exchange-rates/export/pdf')
        .expect(200)
        .expect('Content-Type', 'application/pdf')
        .expect((res) => {
          expect(Buffer.isBuffer(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });
});
