import { Test, type TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;

  const auditLogs: any[] = [];
  const mockPrisma = {
    auditLog: {
      create: jest.fn().mockImplementation((data) => {
        const entry = { id: `log-${auditLogs.length + 1}`, ...data.data, createdAt: new Date() };
        auditLogs.push(entry);
        return Promise.resolve(entry);
      }),
      findMany: jest.fn().mockResolvedValue(auditLogs),
      count: jest.fn().mockResolvedValue(auditLogs.length),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    auditLogs.length = 0; // Clear between tests
  });

  it('should log an audit entry', async () => {
    await service.log({
      action: 'CREATE',
      entity: 'EXCHANGE_RATE',
      entityId: 'rate-1',
      newValue: { rate: 56.5 },
      reason: 'New rate created',
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  });

  it('should log scrape operation', async () => {
    await service.logScrape('CBE', 'bank-1', 'SUCCESS', 5);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'SCRAPE', entity: 'RAW_SCRAPE' }),
      }),
    );
  });

  it('should log validation', async () => {
    await service.logValidation('raw-1', 'PASS', 15, 0);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'VALIDATE' }),
      }),
    );
  });

  it('should log approval', async () => {
    await service.logApproval('approval-1', 'user-1', 'PENDING', 'APPROVED');
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'APPROVE' }),
      }),
    );
  });

  it('should log rejection', async () => {
    await service.logRejection('approval-1', 'user-1', 'Invalid data');
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'REJECT' }),
      }),
    );
  });

  it('should query audit logs with pagination', async () => {
    // Create some logs first
    await service.log({ action: 'CREATE', entity: 'RULE', entityId: 'rule-1' });
    await service.log({ action: 'UPDATE', entity: 'RULE', entityId: 'rule-1' });

    const result = await service.query({ page: 1, limit: 10 });
    expect(result.data).toBeDefined();
    expect(result.meta).toBeDefined();
  });

  it('should filter logs by entity', async () => {
    // Create logs for different entities
    await service.log({ action: 'CREATE', entity: 'RULE', entityId: 'rule-1' });

    const result = await service.query({ entity: 'RULE' });
    expect(result.data).toBeDefined();
  });
});
