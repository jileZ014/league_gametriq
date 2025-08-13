import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ReportsService } from '../reports.service';
import { ReportTemplate, ReportTemplateType } from '../entities/report-template.entity';
import { ScheduledReport, ReportScheduleType } from '../entities/scheduled-report.entity';
import { ReportHistory } from '../entities/report-history.entity';
import { ReportSubscription } from '../entities/report-subscription.entity';
import { ReportGeneratorService } from '../services/report-generator.service';
import { ReportSchedulerService } from '../services/report-scheduler.service';
import { EmailDeliveryService } from '../services/email-delivery.service';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { DataExtractionService } from '../services/data-extraction.service';
import { MockDataGenerator, TestPerformanceMonitor } from '../../../test/setup';

describe('ReportsService', () => {
  let service: ReportsService;
  let templateRepository: Repository<ReportTemplate>;
  let scheduledReportRepository: Repository<ScheduledReport>;
  let historyRepository: Repository<ReportHistory>;
  let subscriptionRepository: Repository<ReportSubscription>;
  let reportsQueue: Queue;
  let reportGeneratorService: ReportGeneratorService;
  let reportSchedulerService: ReportSchedulerService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      getCount: jest.fn(),
    })),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  const mockReportGeneratorService = {
    generateReport: jest.fn(),
  };

  const mockReportSchedulerService = {
    scheduleReport: jest.fn(),
    rescheduleReport: jest.fn(),
    cancelScheduledReport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getRepositoryToken(ReportTemplate),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ScheduledReport),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ReportHistory),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ReportSubscription),
          useValue: mockRepository,
        },
        {
          provide: getQueueToken('reports'),
          useValue: mockQueue,
        },
        {
          provide: ReportGeneratorService,
          useValue: mockReportGeneratorService,
        },
        {
          provide: ReportSchedulerService,
          useValue: mockReportSchedulerService,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    templateRepository = module.get<Repository<ReportTemplate>>(getRepositoryToken(ReportTemplate));
    scheduledReportRepository = module.get<Repository<ScheduledReport>>(getRepositoryToken(ScheduledReport));
    historyRepository = module.get<Repository<ReportHistory>>(getRepositoryToken(ReportHistory));
    subscriptionRepository = module.get<Repository<ReportSubscription>>(getRepositoryToken(ReportSubscription));
    reportsQueue = module.get<Queue>(getQueueToken('reports'));
    reportGeneratorService = module.get<ReportGeneratorService>(ReportGeneratorService);
    reportSchedulerService = module.get<ReportSchedulerService>(ReportSchedulerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTemplate', () => {
    it('should create a report template', async () => {
      const organizationId = 'org-123';
      const userId = 'user-123';
      const dto = {
        name: 'Test Template',
        description: 'Test Description',
        templateType: ReportTemplateType.LEAGUE_SUMMARY,
        sections: [],
        variables: {},
      };

      const mockTemplate = {
        id: 'template-123',
        ...dto,
        organizationId,
        createdById: userId,
      };

      jest.spyOn(templateRepository, 'create').mockReturnValue(mockTemplate as any);
      jest.spyOn(templateRepository, 'save').mockResolvedValue(mockTemplate as any);

      const result = await service.createTemplate(organizationId, userId, dto);

      expect(templateRepository.create).toHaveBeenCalledWith({
        ...dto,
        organizationId,
        createdById: userId,
      });
      expect(templateRepository.save).toHaveBeenCalledWith(mockTemplate);
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('getTemplates', () => {
    it('should return templates for organization', async () => {
      const organizationId = 'org-123';
      const mockTemplates = [
        { id: 'template-1', name: 'Template 1', organizationId },
        { id: 'template-2', name: 'Template 2', organizationId },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockTemplates),
      };

      jest.spyOn(templateRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.getTemplates(organizationId);

      expect(templateRepository.createQueryBuilder).toHaveBeenCalledWith('template');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('template.organizationId = :organizationId', { organizationId });
      expect(result).toEqual(mockTemplates);
    });

    it('should filter templates by type', async () => {
      const organizationId = 'org-123';
      const templateType = ReportTemplateType.FINANCIAL;

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(templateRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      await service.getTemplates(organizationId, { type: templateType });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('template.templateType = :type', { type: templateType });
    });
  });

  describe('createScheduledReport', () => {
    it('should create a scheduled report', async () => {
      const organizationId = 'org-123';
      const userId = 'user-123';
      const dto = {
        templateId: 'template-123',
        name: 'Weekly Report',
        scheduleType: ReportScheduleType.WEEKLY,
        scheduleConfig: { hour: 8, minute: 0, dayOfWeek: 1 },
        recipients: [{ type: 'email' as const, value: 'test@example.com' }],
      };

      const mockTemplate = { id: 'template-123', organizationId };
      const mockScheduledReport = {
        id: 'scheduled-123',
        ...dto,
        organizationId,
        createdById: userId,
        calculateNextRun: jest.fn().mockReturnValue(new Date()),
      };

      jest.spyOn(templateRepository, 'findOne').mockResolvedValue(mockTemplate as any);
      jest.spyOn(scheduledReportRepository, 'create').mockReturnValue(mockScheduledReport as any);
      jest.spyOn(scheduledReportRepository, 'save').mockResolvedValue(mockScheduledReport as any);
      jest.spyOn(reportSchedulerService, 'scheduleReport').mockResolvedValue(undefined);

      const result = await service.createScheduledReport(organizationId, userId, dto);

      expect(templateRepository.findOne).toHaveBeenCalled();
      expect(scheduledReportRepository.create).toHaveBeenCalledWith({
        ...dto,
        organizationId,
        createdById: userId,
      });
      expect(reportSchedulerService.scheduleReport).toHaveBeenCalledWith(mockScheduledReport);
      expect(result).toEqual(mockScheduledReport);
    });
  });

  describe('generateReport', () => {
    it('should queue report generation', async () => {
      const organizationId = 'org-123';
      const userId = 'user-123';
      const dto = {
        templateId: 'template-123',
        name: 'Ad-hoc Report',
      };

      const mockTemplate = { id: 'template-123', organizationId };
      const mockHistory = {
        id: 'history-123',
        organizationId,
        templateId: dto.templateId,
        reportName: dto.name,
      };

      jest.spyOn(templateRepository, 'findOne').mockResolvedValue(mockTemplate as any);
      jest.spyOn(historyRepository, 'create').mockReturnValue(mockHistory as any);
      jest.spyOn(historyRepository, 'save').mockResolvedValue(mockHistory as any);
      jest.spyOn(reportsQueue, 'add').mockResolvedValue({} as any);

      const result = await service.generateReport(organizationId, userId, dto);

      expect(templateRepository.findOne).toHaveBeenCalled();
      expect(historyRepository.create).toHaveBeenCalled();
      expect(historyRepository.save).toHaveBeenCalled();
      expect(reportsQueue.add).toHaveBeenCalledWith(
        'generate-report',
        expect.objectContaining({
          historyId: mockHistory.id,
          organizationId,
          templateId: dto.templateId,
          name: dto.name,
        }),
        expect.any(Object)
      );
      expect(result).toEqual(mockHistory);
    });
  });

  describe('subscribe', () => {
    it('should create a new subscription', async () => {
      const userId = 'user-123';
      const scheduledReportId = 'scheduled-123';

      const mockSubscription = {
        id: 'subscription-123',
        userId,
        scheduledReportId,
        generateUnsubscribeToken: jest.fn().mockReturnValue('token-123'),
      };

      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(subscriptionRepository, 'create').mockReturnValue(mockSubscription as any);
      jest.spyOn(subscriptionRepository, 'save').mockResolvedValue(mockSubscription as any);

      const result = await service.subscribe(userId, scheduledReportId);

      expect(subscriptionRepository.findOne).toHaveBeenCalledWith({
        where: { userId, scheduledReportId },
      });
      expect(subscriptionRepository.create).toHaveBeenCalledWith({
        userId,
        scheduledReportId,
        emailOverride: undefined,
        formatPreference: undefined,
      });
      expect(mockSubscription.generateUnsubscribeToken).toHaveBeenCalled();
      expect(result).toEqual(mockSubscription);
    });

    it('should reactivate existing inactive subscription', async () => {
      const userId = 'user-123';
      const scheduledReportId = 'scheduled-123';

      const mockExistingSubscription = {
        id: 'subscription-123',
        userId,
        scheduledReportId,
        isActive: false,
        resubscribe: jest.fn(),
      };

      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(mockExistingSubscription as any);
      jest.spyOn(subscriptionRepository, 'save').mockResolvedValue(mockExistingSubscription as any);

      const result = await service.subscribe(userId, scheduledReportId);

      expect(mockExistingSubscription.resubscribe).toHaveBeenCalled();
      expect(subscriptionRepository.save).toHaveBeenCalledWith(mockExistingSubscription);
      expect(result).toEqual(mockExistingSubscription);
    });
  });

  describe('getReportStats', () => {
    it('should return report statistics', async () => {
      const organizationId = 'org-123';

      jest.spyOn(templateRepository, 'count').mockResolvedValue(5);
      jest.spyOn(scheduledReportRepository, 'count').mockResolvedValue(3);
      jest.spyOn(historyRepository, 'count').mockResolvedValue(25);

      const result = await service.getReportStats(organizationId);

      expect(result).toEqual({
        totalTemplates: 5,
        totalScheduledReports: 3,
        totalGeneratedReports: 25,
        reportsThisMonth: expect.any(Number),
      });
    });
  });

  describe('Report Validation', () => {
    it('should validate report template exists', async () => {
      const organizationId = 'org-123';
      const templateId = 'non-existent';

      jest.spyOn(templateRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.createScheduledReport(organizationId, 'user-123', {
          templateId,
          name: 'Test Report',
          scheduleType: ReportScheduleType.DAILY,
          scheduleConfig: {},
          recipients: [{ type: 'email', value: 'test@example.com' }],
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate cron expression format', async () => {
      const organizationId = 'org-123';
      const dto = {
        templateId: 'template-123',
        name: 'Invalid Schedule',
        scheduleType: ReportScheduleType.CUSTOM,
        scheduleConfig: { cronExpression: 'invalid-cron' },
        recipients: [{ type: 'email', value: 'test@example.com' }],
      };

      const mockTemplate = { id: 'template-123', organizationId };
      jest.spyOn(templateRepository, 'findOne').mockResolvedValue(mockTemplate as any);

      await expect(
        service.createScheduledReport(organizationId, 'user-123', dto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate email recipients', async () => {
      const organizationId = 'org-123';
      const dto = {
        templateId: 'template-123',
        name: 'Test Report',
        scheduleType: ReportScheduleType.DAILY,
        scheduleConfig: {},
        recipients: [
          { type: 'email', value: 'invalid-email' },
          { type: 'email', value: 'test@example.com' },
        ],
      };

      const mockTemplate = { id: 'template-123', organizationId };
      jest.spyOn(templateRepository, 'findOne').mockResolvedValue(mockTemplate as any);

      await expect(
        service.createScheduledReport(organizationId, 'user-123', dto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Report Generation Performance', () => {
    it('should generate report for 100 teams within threshold', async () => {
      const organizationId = 'org-123';
      const templateId = 'template-123';
      const largeDataSet = {
        teams: Array.from({ length: 100 }, (_, i) => ({
          id: `team-${i}`,
          name: `Team ${i}`,
          wins: Math.floor(Math.random() * 20),
          losses: Math.floor(Math.random() * 20),
        })),
      };

      const mockTemplate = { id: templateId, organizationId };
      const mockHistory = { id: 'history-123' };

      jest.spyOn(templateRepository, 'findOne').mockResolvedValue(mockTemplate as any);
      jest.spyOn(historyRepository, 'create').mockReturnValue(mockHistory as any);
      jest.spyOn(historyRepository, 'save').mockResolvedValue(mockHistory as any);
      jest.spyOn(reportGeneratorService, 'generateReport').mockResolvedValue(largeDataSet);
      jest.spyOn(reportsQueue, 'add').mockResolvedValue({} as any);

      const { duration } = await TestPerformanceMonitor.measureAsync(async () => {
        return service.generateReport(organizationId, 'user-123', {
          templateId,
          name: 'Large Report',
        });
      });

      expect(duration).toMatchPerformanceThreshold(2000);
    });

    it('should handle concurrent report generations', async () => {
      const organizationId = 'org-123';
      const promises = Array.from({ length: 10 }, (_, i) => 
        service.generateReport(organizationId, 'user-123', {
          templateId: 'template-123',
          name: `Report ${i}`,
        })
      );

      const mockTemplate = { id: 'template-123', organizationId };
      jest.spyOn(templateRepository, 'findOne').mockResolvedValue(mockTemplate as any);
      jest.spyOn(historyRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(historyRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(reportsQueue, 'add').mockResolvedValue({} as any);

      const { duration } = await TestPerformanceMonitor.measureAsync(async () => {
        return Promise.all(promises);
      });

      expect(duration).toMatchPerformanceThreshold(5000);
    });
  });

  describe('Scheduled Report Management', () => {
    it('should update scheduled report configuration', async () => {
      const organizationId = 'org-123';
      const reportId = 'scheduled-123';
      const updateDto = {
        scheduleType: ReportScheduleType.MONTHLY,
        scheduleConfig: { dayOfMonth: 1, hour: 9, minute: 0 },
      };

      const mockReport = {
        id: reportId,
        organizationId,
        ...updateDto,
      };

      jest.spyOn(scheduledReportRepository, 'findOne').mockResolvedValue(mockReport as any);
      jest.spyOn(scheduledReportRepository, 'save').mockResolvedValue(mockReport as any);
      jest.spyOn(reportSchedulerService, 'rescheduleReport').mockResolvedValue(undefined);

      const result = await service.updateScheduledReport(organizationId, reportId, updateDto);

      expect(reportSchedulerService.rescheduleReport).toHaveBeenCalledWith(mockReport);
      expect(result).toEqual(mockReport);
    });

    it('should pause and resume scheduled reports', async () => {
      const organizationId = 'org-123';
      const reportId = 'scheduled-123';

      const mockReport = {
        id: reportId,
        organizationId,
        isActive: true,
      };

      jest.spyOn(scheduledReportRepository, 'findOne').mockResolvedValue(mockReport as any);
      jest.spyOn(scheduledReportRepository, 'save').mockResolvedValue({
        ...mockReport,
        isActive: false,
      } as any);
      jest.spyOn(reportSchedulerService, 'cancelScheduledReport').mockResolvedValue(undefined);

      await service.pauseScheduledReport(organizationId, reportId);

      expect(reportSchedulerService.cancelScheduledReport).toHaveBeenCalledWith(reportId);
      expect(scheduledReportRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
    });

    it('should delete scheduled report and its history', async () => {
      const organizationId = 'org-123';
      const reportId = 'scheduled-123';

      const mockReport = { id: reportId, organizationId };

      jest.spyOn(scheduledReportRepository, 'findOne').mockResolvedValue(mockReport as any);
      jest.spyOn(scheduledReportRepository, 'delete').mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(historyRepository, 'delete').mockResolvedValue({ affected: 5 } as any);
      jest.spyOn(subscriptionRepository, 'delete').mockResolvedValue({ affected: 3 } as any);
      jest.spyOn(reportSchedulerService, 'cancelScheduledReport').mockResolvedValue(undefined);

      const result = await service.deleteScheduledReport(organizationId, reportId);

      expect(reportSchedulerService.cancelScheduledReport).toHaveBeenCalledWith(reportId);
      expect(historyRepository.delete).toHaveBeenCalledWith({ scheduledReportId: reportId });
      expect(subscriptionRepository.delete).toHaveBeenCalledWith({ scheduledReportId: reportId });
      expect(result).toEqual({ success: true });
    });
  });

  describe('Report History Tracking', () => {
    it('should track successful report generation', async () => {
      const organizationId = 'org-123';
      const historyId = 'history-123';
      const reportData = { teams: [], games: [] };

      const mockHistory = {
        id: historyId,
        status: 'pending',
        organizationId,
      };

      jest.spyOn(historyRepository, 'findOne').mockResolvedValue(mockHistory as any);
      jest.spyOn(historyRepository, 'save').mockResolvedValue({
        ...mockHistory,
        status: 'completed',
        completedAt: new Date(),
      } as any);

      await service.updateReportHistory(historyId, {
        status: 'completed',
        reportData,
      });

      expect(historyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
        })
      );
    });

    it('should track failed report generation with error details', async () => {
      const organizationId = 'org-123';
      const historyId = 'history-123';
      const error = new Error('Database connection failed');

      const mockHistory = {
        id: historyId,
        status: 'pending',
        organizationId,
      };

      jest.spyOn(historyRepository, 'findOne').mockResolvedValue(mockHistory as any);
      jest.spyOn(historyRepository, 'save').mockResolvedValue({
        ...mockHistory,
        status: 'failed',
        error: error.message,
      } as any);

      await service.updateReportHistory(historyId, {
        status: 'failed',
        error: error.message,
      });

      expect(historyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: 'Database connection failed',
        })
      );
    });

    it('should retrieve paginated history', async () => {
      const organizationId = 'org-123';
      const pagination = { page: 1, limit: 10 };

      const mockHistory = Array.from({ length: 10 }, (_, i) => ({
        id: `history-${i}`,
        organizationId,
        createdAt: new Date(Date.now() - i * 86400000),
      }));

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockHistory),
        getCount: jest.fn().mockResolvedValue(25),
      };

      jest.spyOn(historyRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.getReportHistory(organizationId, pagination);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(0);
      expect(result).toEqual({
        items: mockHistory,
        total: 25,
        page: 1,
        pages: 3,
      });
    });
  });

  describe('Report Delivery', () => {
    it('should deliver report to multiple recipients', async () => {
      const historyId = 'history-123';
      const recipients = [
        { type: 'email', value: 'admin@example.com' },
        { type: 'email', value: 'manager@example.com' },
      ];
      const reportContent = Buffer.from('PDF content');

      await service.deliverReport(historyId, recipients, reportContent);

      expect(reportsQueue.add).toHaveBeenCalledWith(
        'deliver-report',
        expect.objectContaining({
          historyId,
          recipients,
          contentSize: reportContent.length,
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: expect.any(Object),
        })
      );
    });

    it('should handle large recipient lists in batches', async () => {
      const historyId = 'history-123';
      const recipients = Array.from({ length: 100 }, (_, i) => ({
        type: 'email' as const,
        value: `user${i}@example.com`,
      }));
      const reportContent = Buffer.from('PDF content');

      await service.deliverReport(historyId, recipients, reportContent);

      // Should batch in groups of 50
      expect(reportsQueue.add).toHaveBeenCalledTimes(2);
    });
  });

  describe('Template Management', () => {
    it('should clone existing template', async () => {
      const organizationId = 'org-123';
      const templateId = 'template-123';
      const userId = 'user-123';

      const mockTemplate = {
        id: templateId,
        name: 'Original Template',
        organizationId,
        sections: [],
        variables: {},
      };

      const clonedTemplate = {
        ...mockTemplate,
        id: 'template-456',
        name: 'Original Template (Copy)',
        createdById: userId,
      };

      jest.spyOn(templateRepository, 'findOne').mockResolvedValue(mockTemplate as any);
      jest.spyOn(templateRepository, 'create').mockReturnValue(clonedTemplate as any);
      jest.spyOn(templateRepository, 'save').mockResolvedValue(clonedTemplate as any);

      const result = await service.cloneTemplate(organizationId, templateId, userId);

      expect(result.name).toBe('Original Template (Copy)');
      expect(result.createdById).toBe(userId);
    });

    it('should validate template variables', async () => {
      const template = {
        variables: {
          leagueName: { type: 'string', required: true },
          startDate: { type: 'date', required: true },
          includeStats: { type: 'boolean', required: false },
        },
      };

      const validData = {
        leagueName: 'Test League',
        startDate: new Date(),
        includeStats: true,
      };

      const invalidData = {
        leagueName: 'Test League',
        // Missing required startDate
      };

      expect(service.validateTemplateVariables(template, validData)).toBe(true);
      expect(() => service.validateTemplateVariables(template, invalidData)).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing organization gracefully', async () => {
      const organizationId = 'non-existent-org';

      jest.spyOn(templateRepository, 'find').mockResolvedValue([]);

      const result = await service.getTemplates(organizationId);

      expect(result).toEqual([]);
    });

    it('should handle concurrent subscription attempts', async () => {
      const userId = 'user-123';
      const scheduledReportId = 'scheduled-123';

      const promises = Array.from({ length: 5 }, () =>
        service.subscribe(userId, scheduledReportId)
      );

      jest.spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ id: 'sub-123', isActive: true } as any);
      
      jest.spyOn(subscriptionRepository, 'create').mockReturnValue({
        id: 'sub-123',
        generateUnsubscribeToken: jest.fn(),
      } as any);
      
      jest.spyOn(subscriptionRepository, 'save').mockResolvedValue({
        id: 'sub-123',
      } as any);

      const results = await Promise.all(promises);

      // Should only create one subscription
      expect(subscriptionRepository.create).toHaveBeenCalledTimes(1);
      expect(results.every(r => r.id === 'sub-123')).toBe(true);
    });

    it('should clean up orphaned records', async () => {
      const organizationId = 'org-123';

      // Simulate orphaned history records
      const orphanedHistory = Array.from({ length: 10 }, (_, i) => ({
        id: `orphan-${i}`,
        scheduledReportId: null,
        templateId: null,
      }));

      jest.spyOn(historyRepository, 'find').mockResolvedValue(orphanedHistory as any);
      jest.spyOn(historyRepository, 'delete').mockResolvedValue({ affected: 10 } as any);

      const result = await service.cleanupOrphanedRecords(organizationId);

      expect(historyRepository.delete).toHaveBeenCalledWith({
        id: expect.any(Array),
      });
      expect(result.deletedCount).toBe(10);
    });
  });
});