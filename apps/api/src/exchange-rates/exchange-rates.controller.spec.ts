import { Test, type TestingModule } from '@nestjs/testing';
import { ExchangeRatesController } from './exchange-rates.controller';
import { ExchangeRatesService } from './exchange-rates.service';

describe('ExchangeRatesController', () => {
  let controller: ExchangeRatesController;

  const mockService = {
    getLatestRates: jest.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    getHistoricalRates: jest.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    compareRates: jest.fn().mockResolvedValue({ banks: [], summary: null }),
    getBestRates: jest.fn().mockResolvedValue({ best: null, worst: null, average: 0, banks: [] }),
    exportCsv: jest.fn().mockResolvedValue('col1,col2\nval1,val2'),
    exportPdf: jest.fn().mockResolvedValue('<html><body>PDF</body></html>'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExchangeRatesController],
      providers: [
        { provide: ExchangeRatesService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<ExchangeRatesController>(ExchangeRatesController);
  });

  describe('GET /latest', () => {
    it('should return latest rates', async () => {
      const result = await controller.getLatestRates({});
      expect(result.data).toEqual([]);
      expect(mockService.getLatestRates).toHaveBeenCalled();
    });
  });

  describe('GET /historical', () => {
    it('should return historical rates', async () => {
      const result = await controller.getHistoricalRates({});
      expect(result.data).toEqual([]);
      expect(mockService.getHistoricalRates).toHaveBeenCalled();
    });
  });

  describe('GET /compare', () => {
    it('should return comparison data', async () => {
      const result = await controller.compareRates({});
      expect(result.banks).toEqual([]);
      expect(mockService.compareRates).toHaveBeenCalled();
    });
  });

  describe('GET /best', () => {
    it('should return best rates', async () => {
      const result = await controller.getBestRates({});
      expect(result.best).toBeNull();
      expect(mockService.getBestRates).toHaveBeenCalled();
    });
  });

  describe('GET /export/csv', () => {
    it('should return CSV string', async () => {
      const result = await controller.exportCsv({});
      expect(result).toContain('col1');
      expect(mockService.exportCsv).toHaveBeenCalled();
    });
  });

  describe('GET /export/pdf', () => {
    it('should generate PDF and set response headers', async () => {
      const mockPdfBuffer = Buffer.from('%PDF-1.4...mock-pdf-content');
      mockService.exportPdf.mockResolvedValue(mockPdfBuffer);

      const mockRes = {
        setHeader: jest.fn(),
        end: jest.fn(),
      };

      await controller.exportPdf({}, mockRes as any);

      expect(mockService.exportPdf).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="exchange-rates-report.pdf"',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Length', mockPdfBuffer.length);
      expect(mockRes.end).toHaveBeenCalledWith(mockPdfBuffer);
    });
  });

  describe('GET /currencies', () => {
    it('should return list of supported currencies', () => {
      const result = controller.getCurrencies();
      expect(result.data).toContain('USD');
      expect(result.data).toContain('EUR');
      expect(result.base).toBe('ETB');
    });
  });
});
