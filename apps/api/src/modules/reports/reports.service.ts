import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

// Entities
import { ReportTemplate } from './entities/report-template.entity';
import { ScheduledReport } from './entities/scheduled-report.entity';
import { ReportHistory, ReportStatus } from './entities/report-history.entity';
import { ReportSubscription } from './entities/report-subscription.entity';

// DTOs
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { CreateScheduledReportDto } from './dto/create-scheduled-report.dto';
import { GenerateReportDto } from './dto/generate-report.dto';

// Services
import { ReportGeneratorService } from './services/report-generator.service';
import { ReportSchedulerService } from './services/report-scheduler.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(ReportTemplate)
    private readonly templatesRepository: Repository<ReportTemplate>,
    @InjectRepository(ScheduledReport)
    private readonly scheduledReportsRepository: Repository<ScheduledReport>,
    @InjectRepository(ReportHistory)
    private readonly historyRepository: Repository<ReportHistory>,
    @InjectRepository(ReportSubscription)
    private readonly subscriptionsRepository: Repository<ReportSubscription>,
    @InjectQueue('reports')
    private readonly reportsQueue: Queue,
    private readonly reportGeneratorService: ReportGeneratorService,
    private readonly reportSchedulerService: ReportSchedulerService,
  ) {}

  // ============================================================================
  // Report Templates
  // ============================================================================

  async createTemplate(
    organizationId: string,
    userId: string,
    dto: CreateReportTemplateDto,
  ): Promise<ReportTemplate> {
    this.logger.log(`Creating report template: ${dto.name} for organization ${organizationId}`);

    const template = this.templatesRepository.create({
      ...dto,
      organizationId,
      createdById: userId,
    });

    return await this.templatesRepository.save(template);
  }

  async getTemplates(
    organizationId: string,
    options?: {
      type?: string;
      isActive?: boolean;
      includeSystem?: boolean;
    },
  ): Promise<ReportTemplate[]> {
    const queryBuilder = this.templatesRepository
      .createQueryBuilder('template')
      .where('template.organizationId = :organizationId', { organizationId });

    if (options?.type) {
      queryBuilder.andWhere('template.templateType = :type', { type: options.type });
    }

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('template.isActive = :isActive', { isActive: options.isActive });
    }

    if (options?.includeSystem) {
      queryBuilder.orWhere('template.isSystem = true');
    }

    return await queryBuilder.getMany();
  }

  async getTemplate(id: string, organizationId: string): Promise<ReportTemplate> {
    const template = await this.templatesRepository.findOne({
      where: [
        { id, organizationId },
        { id, isSystem: true }, // Allow access to system templates
      ],
      relations: ['createdBy'],
    });

    if (!template) {
      throw new NotFoundException(`Report template with ID ${id} not found`);
    }

    return template;
  }

  async updateTemplate(
    id: string,
    organizationId: string,
    dto: Partial<CreateReportTemplateDto>,
  ): Promise<ReportTemplate> {
    const template = await this.getTemplate(id, organizationId);

    if (template.isSystem) {
      throw new BadRequestException('Cannot modify system templates');
    }

    Object.assign(template, dto);
    return await this.templatesRepository.save(template);
  }

  async deleteTemplate(id: string, organizationId: string): Promise<void> {
    const template = await this.getTemplate(id, organizationId);

    if (template.isSystem) {
      throw new BadRequestException('Cannot delete system templates');
    }

    await this.templatesRepository.delete(id);
    this.logger.log(`Deleted report template: ${id}`);
  }

  // ============================================================================
  // Scheduled Reports
  // ============================================================================

  async createScheduledReport(
    organizationId: string,
    userId: string,
    dto: CreateScheduledReportDto,
  ): Promise<ScheduledReport> {
    this.logger.log(`Creating scheduled report: ${dto.name} for organization ${organizationId}`);

    // Validate template exists
    await this.getTemplate(dto.templateId, organizationId);

    const scheduledReport = this.scheduledReportsRepository.create({
      ...dto,
      organizationId,
      createdById: userId,
    });

    // Calculate next run time
    scheduledReport.nextRun = scheduledReport.calculateNextRun();

    const savedReport = await this.scheduledReportsRepository.save(scheduledReport);

    // Schedule the report
    await this.reportSchedulerService.scheduleReport(savedReport);

    return savedReport;
  }

  async getScheduledReports(
    organizationId: string,
    options?: {
      leagueId?: string;
      isActive?: boolean;
    },
  ): Promise<ScheduledReport[]> {
    const queryBuilder = this.scheduledReportsRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.template', 'template')
      .where('report.organizationId = :organizationId', { organizationId });

    if (options?.leagueId) {
      queryBuilder.andWhere('report.leagueId = :leagueId', { leagueId: options.leagueId });
    }

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('report.isActive = :isActive', { isActive: options.isActive });
    }

    return await queryBuilder.getMany();
  }

  async getScheduledReport(id: string, organizationId: string): Promise<ScheduledReport> {
    const report = await this.scheduledReportsRepository.findOne({
      where: { id, organizationId },
      relations: ['template', 'createdBy'],
    });

    if (!report) {
      throw new NotFoundException(`Scheduled report with ID ${id} not found`);
    }

    return report;
  }

  async updateScheduledReport(
    id: string,
    organizationId: string,
    dto: Partial<CreateScheduledReportDto>,
  ): Promise<ScheduledReport> {
    const report = await this.getScheduledReport(id, organizationId);

    Object.assign(report, dto);

    // Recalculate next run if schedule changed
    if (dto.scheduleType || dto.scheduleConfig) {
      report.nextRun = report.calculateNextRun();
    }

    const savedReport = await this.scheduledReportsRepository.save(report);

    // Reschedule if needed
    if (dto.scheduleType || dto.scheduleConfig || dto.isActive !== undefined) {
      await this.reportSchedulerService.rescheduleReport(savedReport);
    }

    return savedReport;
  }

  async deleteScheduledReport(id: string, organizationId: string): Promise<void> {
    const report = await this.getScheduledReport(id, organizationId);

    // Cancel scheduled jobs
    await this.reportSchedulerService.cancelScheduledReport(id);

    await this.scheduledReportsRepository.delete(id);
    this.logger.log(`Deleted scheduled report: ${id}`);
  }

  // ============================================================================
  // Report Generation
  // ============================================================================

  async generateReport(
    organizationId: string,
    userId: string,
    dto: GenerateReportDto,
  ): Promise<ReportHistory> {
    this.logger.log(`Generating ad-hoc report: ${dto.name} for organization ${organizationId}`);

    // Validate template
    const template = await this.getTemplate(dto.templateId, organizationId);

    // Create history record
    const historyRecord = this.historyRepository.create({
      organizationId,
      templateId: dto.templateId,
      reportName: dto.name,
      format: dto.format || template.sections[0]?.type === 'chart' ? 'pdf' : 'html',
      status: ReportStatus.PENDING,
      filtersApplied: dto.filters || {},
      metadata: {
        generatedBy: userId,
        isAdHoc: true,
        variables: dto.variables || {},
      },
    });

    const savedHistory = await this.historyRepository.save(historyRecord);

    // Queue report generation
    await this.reportsQueue.add(
      'generate-report',
      {
        historyId: savedHistory.id,
        organizationId,
        templateId: dto.templateId,
        name: dto.name,
        format: dto.format,
        filters: dto.filters,
        variables: dto.variables,
        includeCharts: dto.includeCharts,
        deliveryMethod: dto.deliveryMethod,
        recipients: dto.recipients,
        isPreview: dto.isPreview,
      },
      {
        priority: dto.isPreview ? 1 : 10, // Higher priority for previews
        delay: dto.isPreview ? 0 : 5000, // Immediate for previews
      },
    );

    return savedHistory;
  }

  async getReportHistory(
    organizationId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: ReportStatus;
      templateId?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{ reports: ReportHistory[]; total: number }> {
    const queryBuilder = this.historyRepository
      .createQueryBuilder('history')
      .leftJoinAndSelect('history.template', 'template')
      .leftJoinAndSelect('history.scheduledReport', 'scheduledReport')
      .where('history.organizationId = :organizationId', { organizationId });

    if (options?.status) {
      queryBuilder.andWhere('history.status = :status', { status: options.status });
    }

    if (options?.templateId) {
      queryBuilder.andWhere('history.templateId = :templateId', { templateId: options.templateId });
    }

    if (options?.startDate) {
      queryBuilder.andWhere('history.generatedAt >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('history.generatedAt <= :endDate', { endDate: options.endDate });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy('history.generatedAt', 'DESC')
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    const reports = await queryBuilder.getMany();

    return { reports, total };
  }

  async downloadReport(id: string, organizationId: string): Promise<ReportHistory> {
    const report = await this.historyRepository.findOne({
      where: { id, organizationId },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    if (report.status !== ReportStatus.GENERATED && report.status !== ReportStatus.DELIVERED) {
      throw new BadRequestException(`Report is not ready for download. Current status: ${report.status}`);
    }

    if (report.isExpired()) {
      throw new BadRequestException('Report has expired and is no longer available');
    }

    return report;
  }

  // ============================================================================
  // Report Subscriptions
  // ============================================================================

  async subscribe(
    userId: string,
    scheduledReportId: string,
    options?: {
      emailOverride?: string;
      formatPreference?: string;
    },
  ): Promise<ReportSubscription> {
    const existingSubscription = await this.subscriptionsRepository.findOne({
      where: { userId, scheduledReportId },
    });

    if (existingSubscription) {
      if (!existingSubscription.isActive) {
        existingSubscription.resubscribe();
        return await this.subscriptionsRepository.save(existingSubscription);
      }
      return existingSubscription;
    }

    const subscription = this.subscriptionsRepository.create({
      userId,
      scheduledReportId,
      emailOverride: options?.emailOverride,
      formatPreference: options?.formatPreference as any,
    });

    subscription.generateUnsubscribeToken();

    return await this.subscriptionsRepository.save(subscription);
  }

  async unsubscribe(token: string): Promise<void> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { unsubscribeToken: token },
    });

    if (!subscription) {
      throw new NotFoundException('Invalid unsubscribe token');
    }

    subscription.unsubscribe();
    await this.subscriptionsRepository.save(subscription);
  }

  async getUserSubscriptions(userId: string): Promise<ReportSubscription[]> {
    return await this.subscriptionsRepository.find({
      where: { userId, isActive: true },
      relations: ['scheduledReport', 'scheduledReport.template'],
    });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  async getReportStats(organizationId: string): Promise<{
    totalTemplates: number;
    totalScheduledReports: number;
    totalGeneratedReports: number;
    reportsThisMonth: number;
  }> {
    const [totalTemplates] = await Promise.all([
      this.templatesRepository.count({ where: { organizationId } }),
    ]);

    const [totalScheduledReports] = await Promise.all([
      this.scheduledReportsRepository.count({ where: { organizationId } }),
    ]);

    const [totalGeneratedReports] = await Promise.all([
      this.historyRepository.count({ where: { organizationId } }),
    ]);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [reportsThisMonth] = await Promise.all([
      this.historyRepository.count({
        where: {
          organizationId,
          generatedAt: {
            $gte: startOfMonth,
          } as any,
        },
      }),
    ]);

    return {
      totalTemplates,
      totalScheduledReports,
      totalGeneratedReports,
      reportsThisMonth,
    };
  }
}