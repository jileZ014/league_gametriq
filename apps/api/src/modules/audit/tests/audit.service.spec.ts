import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit.service';
import { AuditLog, AuditAction, AuditEventStatus } from '../audit.entity';

describe('AuditService', () => {
  let service: AuditService;
  let repository: Repository<AuditLog>;
  let configService: ConfigService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(90),
  };

  const mockRequest = {
    method: 'POST',
    originalUrl: '/api/payments/process?token=secret123&amount=100',
    ip: '192.168.1.1',
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'x-forwarded-for': '10.0.0.1, 192.168.1.1',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    repository = module.get<Repository<AuditLog>>(getRepositoryToken(AuditLog));
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should create an audit log entry', async () => {
      const mockAuditLog = {
        id: 'test-id',
        action: AuditAction.PAYMENT_COMPLETED,
        status: AuditEventStatus.SUCCESS,
        createdAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      const result = await service.log({
        action: AuditAction.PAYMENT_COMPLETED,
        status: AuditEventStatus.SUCCESS,
        context: {
          organizationId: 'org-123',
          userId: 'user-456',
          request: mockRequest as any,
        },
        metadata: {
          paymentAmount: 100,
          paymentCurrency: 'USD',
        },
      });

      expect(result).toEqual(mockAuditLog);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PAYMENT_COMPLETED,
          status: AuditEventStatus.SUCCESS,
          organizationId: 'org-123',
          userId: 'user-456',
          ipAddress: '10.0.0.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          requestMethod: 'POST',
          requestUrl: '/api/payments/process?token=[REDACTED]&amount=100',
        }),
      );
    });

    it('should sanitize sensitive URL parameters', async () => {
      const mockAuditLog = { id: 'test-id' };
      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      await service.log({
        action: AuditAction.USER_LOGIN,
        context: {
          request: {
            ...mockRequest,
            originalUrl: '/api/auth/login?password=secret&api_key=12345&email=test@example.com',
          } as any,
        },
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestUrl: '/api/auth/login?password=[REDACTED]&api_key=[REDACTED]&email=test@example.com',
        }),
      );
    });

    it('should sanitize PII from metadata', async () => {
      const mockAuditLog = { id: 'test-id' };
      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      await service.log({
        action: AuditAction.PAYMENT_COMPLETED,
        metadata: {
          paymentAmount: 100,
          creditCard: '4111111111111111',
          cvv: '123',
          ssn: '123-45-6789',
          paymentLast4: '1111111111',
        },
      });

      const createCall = mockRepository.create.mock.calls[0][0];
      expect(createCall.metadata).toEqual({
        paymentAmount: 100,
        paymentLast4: '1111',
      });
      expect(createCall.metadata.creditCard).toBeUndefined();
      expect(createCall.metadata.cvv).toBeUndefined();
      expect(createCall.metadata.ssn).toBeUndefined();
    });

    it('should handle errors gracefully without throwing', async () => {
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      const result = await service.log({
        action: AuditAction.USER_LOGIN,
        context: { userId: 'user-123' },
      });

      expect(result).toBeNull();
    });

    it('should calculate expiry date based on retention days', async () => {
      const mockAuditLog = { id: 'test-id' };
      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      const now = new Date();
      await service.log({
        action: AuditAction.USER_LOGIN,
        context: { userId: 'user-123' },
      });

      const createCall = mockRepository.create.mock.calls[0][0];
      const expiresAt = createCall.expiresAt;
      
      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
      
      // Should be approximately 90 days in the future
      const daysDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(daysDiff)).toBe(90);
    });
  });

  describe('logSuccess', () => {
    it('should log a successful action', async () => {
      const mockAuditLog = { id: 'test-id' };
      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      await service.logSuccess(
        AuditAction.REGISTRATION_COMPLETED,
        { organizationId: 'org-123', userId: 'user-456' },
        { entityType: 'registration', entityId: 'reg-789' },
        'User successfully registered',
      );

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.REGISTRATION_COMPLETED,
          status: AuditEventStatus.SUCCESS,
          description: 'User successfully registered',
        }),
      );
    });
  });

  describe('logFailure', () => {
    it('should log a failed action with error details', async () => {
      const mockAuditLog = { id: 'test-id' };
      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      const error = new Error('Payment gateway timeout');
      (error as any).code = 'GATEWAY_TIMEOUT';

      await service.logFailure(
        AuditAction.PAYMENT_FAILED,
        { organizationId: 'org-123', userId: 'user-456' },
        error,
        { paymentAmount: 100 },
      );

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PAYMENT_FAILED,
          status: AuditEventStatus.FAILURE,
          description: 'Payment gateway timeout',
          metadata: expect.objectContaining({
            paymentAmount: 100,
            errorMessage: 'Payment gateway timeout',
            errorCode: 'GATEWAY_TIMEOUT',
          }),
        }),
      );
    });
  });

  describe('findLogs', () => {
    it('should query logs with filters', async () => {
      const mockLogs = [
        { id: '1', action: AuditAction.PAYMENT_COMPLETED },
        { id: '2', action: AuditAction.PAYMENT_COMPLETED },
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        getMany: jest.fn().mockResolvedValue(mockLogs),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findLogs({
        organizationId: 'org-123',
        action: AuditAction.PAYMENT_COMPLETED,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual({ logs: mockLogs, total: 2 });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.organization_id = :orgId',
        { orgId: 'org-123' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.action = :action',
        { action: AuditAction.PAYMENT_COMPLETED },
      );
    });

    it('should handle array of actions', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findLogs({
        action: [AuditAction.PAYMENT_COMPLETED, AuditAction.PAYMENT_FAILED],
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.action IN (:...actions)',
        { actions: [AuditAction.PAYMENT_COMPLETED, AuditAction.PAYMENT_FAILED] },
      );
    });
  });

  describe('getEntityHistory', () => {
    it('should get audit logs for a specific entity', async () => {
      const mockLogs = [
        { id: '1', entityType: 'payment', entityId: 'pay-123' },
        { id: '2', entityType: 'payment', entityId: 'pay-123' },
      ];

      mockRepository.find.mockResolvedValue(mockLogs);

      const result = await service.getEntityHistory('payment', 'pay-123', 10);

      expect(result).toEqual(mockLogs);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          entityType: 'payment',
          entityId: 'pay-123',
        },
        order: {
          createdAt: 'DESC',
        },
        take: 10,
      });
    });
  });

  describe('cleanupExpiredLogs', () => {
    it('should delete logs older than retention period', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 100 });

      await service.cleanupExpiredLogs();

      expect(mockRepository.delete).toHaveBeenCalledWith({
        createdAt: expect.any(Object),
      });
    });

    it('should handle cleanup errors gracefully', async () => {
      mockRepository.delete.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(service.cleanupExpiredLogs()).resolves.not.toThrow();
    });
  });

  describe('performance', () => {
    it('should complete audit logging within 5ms', async () => {
      const mockAuditLog = { id: 'test-id' };
      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      const startTime = Date.now();
      
      await service.log({
        action: AuditAction.USER_LOGIN,
        context: { userId: 'user-123' },
      });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5);
    });
  });
});