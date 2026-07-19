import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PageDetectorService } from '../detection/page-detector.service';

describe('PageDetectorService', () => {
  let service: PageDetectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PageDetectorService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(30_000) },
        },
      ],
    }).compile();

    service = module.get<PageDetectorService>(PageDetectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectByUrl', () => {
    it('should detect PDF from .pdf extension', () => {
      expect(service.detectByUrl('https://example.com/rates.pdf')).toBe('pdf');
    });

    it('should detect PDF from /pdf/ path', () => {
      expect(service.detectByUrl('https://example.com/pdf/rates')).toBe('pdf');
    });

    it('should detect API from /api/ path', () => {
      expect(service.detectByUrl('https://api.example.com/rates')).toBe('api');
    });

    it('should detect JSON endpoint', () => {
      expect(service.detectByUrl('https://example.com/rates.json')).toBe('api');
    });

    it('should detect playwright from hash fragments', () => {
      expect(service.detectByUrl('https://example.com/#exchange')).toBe('playwright');
      expect(service.detectByUrl('https://example.com/#rates')).toBe('playwright');
      expect(service.detectByUrl('https://example.com/#currency')).toBe('playwright');
    });

    it('should return null for unknown URLs', () => {
      expect(service.detectByUrl('https://example.com/exchange-rates')).toBeNull();
    });
  });
});
