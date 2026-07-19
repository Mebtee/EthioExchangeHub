import { Test, type TestingModule } from '@nestjs/testing';
import { ApprovalEngineService } from '../approval/approval-engine.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ApprovalEngineService', () => {
  let service: ApprovalEngineService;

  const mockPrisma = {
    approvalRecord: {
      create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'approval-1', ...data.data, status: 'PENDING' })),
      findUnique: jest.fn().mockImplementation(({ where: { id } }) => {
        if (id === 'approval-1') return Promise.resolve({ id, status: 'PENDING', confidenceScore: 85, version: 1 });
        if (id === 'approved-1') return Promise.resolve({ id, status: 'APPROVED', confidenceScore: 90, version: 1 });
        return Promise.resolve(null);
      }),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ status: data.status })),
      count: jest.fn().mockResolvedValue(5),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalEngineService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ApprovalEngineService>(ApprovalEngineService);
  });

  it('should create pending approval record', async () => {
    const result = await service.createPending('raw-1', 'bank-1', 85);
    expect(result.status).toBe('PENDING');
    expect(result.id).toBeDefined();
  });

  it('should validate a pending record', async () => {
    const status = await service.validate('approval-1');
    expect(status).toBe('VALIDATED');
  });

  it('should approve a pending record', async () => {
    const status = await service.approve('approval-1', 'user-1', 'Looks good');
    expect(status).toBe('APPROVED');
    expect(mockPrisma.approvalRecord.update).toHaveBeenCalled();
  });

  it('should reject a pending record with reason', async () => {
    const status = await service.reject('approval-1', 'user-1', 'Data looks incorrect');
    expect(status).toBe('REJECTED');
  });

  it('should throw when approving a non-existent record', async () => {
    await expect(service.approve('nonexistent', 'user-1')).rejects.toThrow('not found');
  });

  it('should throw when approving a rejected record', async () => {
    mockPrisma.approvalRecord.findUnique.mockResolvedValueOnce({ id: 'rejected-1', status: 'REJECTED' });
    await expect(service.approve('rejected-1', 'user-1')).rejects.toThrow('Cannot approve a rejected record');
  });

  it('should mark as estimated', async () => {
    const status = await service.markAsEstimated('approval-1', 'Estimated from NBE data');
    expect(status).toBe('ESTIMATED');
  });

  it('should allow APPROVED and VALIDATED in production', () => {
    expect(service.isAllowedInProduction('APPROVED')).toBe(true);
    expect(service.isAllowedInProduction('VALIDATED')).toBe(true);
    expect(service.isAllowedInProduction('PENDING')).toBe(false);
    expect(service.isAllowedInProduction('REJECTED')).toBe(false);
    expect(service.isAllowedInProduction('ESTIMATED')).toBe(false);
  });
});
