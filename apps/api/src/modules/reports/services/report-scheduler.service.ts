import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';

import { ScheduledReport } from '../entities/scheduled-report.entity';
import { ReportHistory, ReportStatus } from '../entities/report-history.entity';

@Injectable()
export class ReportSchedulerService {
  private readonly logger = new Logger(ReportSchedulerService.name);

  constructor(
    @InjectRepository(ScheduledReport)
    private readonly scheduledReportsRepository: Repository<ScheduledReport>,
    @InjectRepository(ReportHistory)
    private readonly historyRepository: Repository<ReportHistory>,
    @InjectQueue('reports')
    private readonly reportsQueue: Queue,
  ) {}

  /**
   * Cron job that runs every hour to check for scheduled reports
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledReports(): Promise<void> {
    this.logger.log('Processing scheduled reports...');

    try {
      const now = new Date();
      const dueReports = await this.scheduledReportsRepository.find({
        where: {
          isActive: true,
          nextRun: LessThanOrEqual(now),
        },
        relations: ['template'],
      });

      this.logger.log(`Found ${dueReports.length} reports due for execution`);

      for (const report of dueReports) {
        try {
          await this.executeScheduledReport(report);
        } catch (error) {
          this.logger.error(
            `Failed to execute scheduled report ${report.id}: ${error.message}`,
            error.stack
          );
          
          // Update failure count and last failure
          report.incrementFailure();
          await this.scheduledReportsRepository.save(report);
        }
      }

    } catch (error) {
      this.logger.error('Error in processScheduledReports', error);
    }
  }

  /**
   * Schedule a new report
   */
  async scheduleReport(report: ScheduledReport): Promise<void> {
    this.logger.log(`Scheduling report: ${report.name} (${report.id})`);

    // Create recurring job in Bull queue
    const jobName = `scheduled-report-${report.id}`;
    
    // Remove existing job if it exists
    await this.cancelScheduledReport(report.id);

    // Calculate delay until next run
    const now = new Date();
    const delay = report.nextRun ? Math.max(0, report.nextRun.getTime() - now.getTime()) : 0;

    // Add job to queue
    await this.reportsQueue.add(
      'execute-scheduled-report',
      {
        scheduledReportId: report.id,
        organizationId: report.organizationId,
      },
      {
        jobId: jobName,
        delay,
        repeat: this.buildRepeatOptions(report),
        attempts: report.maxRetries,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );

    this.logger.log(`Report scheduled successfully: ${report.id}`);
  }

  /**
   * Reschedule an existing report
   */
  async rescheduleReport(report: ScheduledReport): Promise<void> {
    this.logger.log(`Rescheduling report: ${report.name} (${report.id})`);

    if (report.isActive) {
      await this.scheduleReport(report);
    } else {
      await this.cancelScheduledReport(report.id);
    }
  }

  /**
   * Cancel a scheduled report
   */
  async cancelScheduledReport(reportId: string): Promise<void> {
    const jobName = `scheduled-report-${reportId}`;
    
    // Remove from Bull queue
    const jobs = await this.reportsQueue.getRepeatableJobs();
    const job = jobs.find(j => j.id === jobName);
    
    if (job) {
      await this.reportsQueue.removeRepeatableByKey(job.key);
      this.logger.log(`Cancelled scheduled report: ${reportId}`);
    }
  }

  /**
   * Execute a scheduled report
   */
  private async executeScheduledReport(report: ScheduledReport): Promise<void> {
    this.logger.log(`Executing scheduled report: ${report.name} (${report.id})`);

    // Create history record
    const historyRecord = this.historyRepository.create({
      organizationId: report.organizationId,
      scheduledReportId: report.id,
      templateId: report.templateId,
      reportName: `${report.name} - ${this.formatDateForFilename(new Date())}`,
      format: report.format,
      status: ReportStatus.PENDING,
      filtersApplied: report.filters,
      recipients: report.recipients.map(r => ({ email: r.value, name: r.name })),
      deliveryMethod: report.deliveryMethod,
      metadata: {
        isScheduled: true,
        scheduledReportId: report.id,
      },
    });

    const savedHistory = await this.historyRepository.save(historyRecord);

    // Queue report generation
    await this.reportsQueue.add(
      'generate-report',
      {
        historyId: savedHistory.id,
        organizationId: report.organizationId,
        templateId: report.templateId,
        name: historyRecord.reportName,
        format: report.format,
        filters: {
          ...report.filters,
          leagueId: report.leagueId,
          seasonId: report.seasonId,
          divisionId: report.divisionId,
        },
        includeCharts: report.includeCharts,
        deliveryMethod: report.deliveryMethod,
        recipients: report.getRecipientEmails(),
        includeAttachments: report.includeAttachments,
        isScheduled: true,
      },
      {
        priority: 5, // Medium priority for scheduled reports
        attempts: report.maxRetries,
      }
    );

    // Update last run and calculate next run
    report.lastRun = new Date();
    report.nextRun = report.calculateNextRun();
    report.resetRetries();

    await this.scheduledReportsRepository.save(report);

    this.logger.log(`Scheduled report queued for execution: ${report.id}`);
  }

  /**
   * Build repeat options for Bull queue based on schedule configuration
   */
  private buildRepeatOptions(report: ScheduledReport): any {
    const config = report.scheduleConfig;
    const timezone = report.timezone || 'America/Phoenix';

    switch (report.scheduleType) {
      case 'daily':
        return {
          cron: `${config.minute || 0} ${config.hour || 8} * * *`,
          tz: timezone,
        };

      case 'weekly':
        return {
          cron: `${config.minute || 0} ${config.hour || 8} * * ${config.dayOfWeek || 1}`,
          tz: timezone,
        };

      case 'monthly':
        return {
          cron: `${config.minute || 0} ${config.hour || 8} ${config.dayOfMonth || 1} * *`,
          tz: timezone,
        };

      case 'custom':
        if (config.cronExpression) {
          return {
            cron: config.cronExpression,
            tz: timezone,
          };
        }
        break;
    }

    // Default to daily at 8 AM
    return {
      cron: '0 8 * * *',
      tz: timezone,
    };
  }

  /**
   * Get next run times for all active scheduled reports
   */
  async getUpcomingReports(
    organizationId: string,
    limit = 50
  ): Promise<Array<{ report: ScheduledReport; nextRun: Date }>> {
    const reports = await this.scheduledReportsRepository.find({
      where: {
        organizationId,
        isActive: true,
      },
      relations: ['template'],
      take: limit,
      order: { nextRun: 'ASC' },
    });

    return reports
      .filter(r => r.nextRun)
      .map(report => ({
        report,
        nextRun: report.nextRun!,
      }))
      .sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime());
  }

  /**
   * Get report execution statistics
   */
  async getReportStats(organizationId: string): Promise<{
    totalScheduledReports: number;
    activeReports: number;
    reportsExecutedThisMonth: number;
    avgExecutionTime: number;
    successRate: number;
  }> {
    // Get scheduled reports counts
    const [totalScheduledReports, activeReports] = await Promise.all([
      this.scheduledReportsRepository.count({ where: { organizationId } }),
      this.scheduledReportsRepository.count({ where: { organizationId, isActive: true } }),
    ]);

    // Get this month's execution stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyHistory = await this.historyRepository.find({
      where: {
        organizationId,
        generatedAt: LessThanOrEqual(startOfMonth) as any,
      },
      select: ['status', 'generationTimeMs'],
    });

    const reportsExecutedThisMonth = monthlyHistory.length;
    const successfulReports = monthlyHistory.filter(h => 
      h.status === ReportStatus.GENERATED || h.status === ReportStatus.DELIVERED
    );

    const successRate = reportsExecutedThisMonth > 0 
      ? (successfulReports.length / reportsExecutedThisMonth) * 100 
      : 100;

    const avgExecutionTime = successfulReports.length > 0
      ? successfulReports
          .filter(h => h.generationTimeMs)
          .reduce((sum, h) => sum + (h.generationTimeMs || 0), 0) / successfulReports.length
      : 0;

    return {
      totalScheduledReports,
      activeReports,
      reportsExecutedThisMonth,
      avgExecutionTime: Math.round(avgExecutionTime),
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  /**
   * Retry failed scheduled reports
   */
  async retryFailedReports(organizationId: string, maxAge = 24): Promise<number> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxAge);

    const failedReports = await this.scheduledReportsRepository.find({
      where: {
        organizationId,
        isActive: true,
        lastFailure: LessThanOrEqual(cutoffTime) as any,
      },
      relations: ['template'],
    });

    let retriedCount = 0;

    for (const report of failedReports) {
      if (report.shouldRetry()) {
        try {
          await this.executeScheduledReport(report);
          retriedCount++;
        } catch (error) {
          this.logger.error(`Retry failed for report ${report.id}: ${error.message}`);
        }
      }
    }

    this.logger.log(`Retried ${retriedCount} failed reports for organization ${organizationId}`);
    return retriedCount;
  }

  /**
   * Clean up old report history
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldReports(): Promise<void> {
    this.logger.log('Starting cleanup of old report history...');

    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 6); // Keep 6 months of history

      const result = await this.historyRepository.delete({
        generatedAt: LessThanOrEqual(cutoffDate) as any,
        status: ReportStatus.DELIVERED, // Only delete delivered reports
      });

      this.logger.log(`Cleaned up ${result.affected} old report records`);

    } catch (error) {
      this.logger.error('Error during report cleanup', error);
    }
  }

  /**
   * Format date for filename (YYYY-MM-DD)
   */
  private formatDateForFilename(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Validate cron expression
   */
  validateCronExpression(expression: string): boolean {
    // Basic cron validation - in production, use a proper cron parser
    const cronRegex = /^(\*|[0-5]?\d)\s+(\*|[01]?\d|2[0-3])\s+(\*|[01]?\d|2\d|3[01])\s+(\*|[01]?\d)\s+(\*|[0-6])$/;
    return cronRegex.test(expression.trim());
  }

  /**
   * Test a scheduled report without actually scheduling it
   */
  async testScheduledReport(reportId: string): Promise<Date[]> {
    const report = await this.scheduledReportsRepository.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new Error(`Scheduled report ${reportId} not found`);
    }

    // Calculate next 5 run times
    const nextRuns: Date[] = [];
    let currentDate = new Date();

    for (let i = 0; i < 5; i++) {
      const tempReport = Object.assign(new ScheduledReport(), {
        ...report,
        scheduleConfig: { ...report.scheduleConfig },
      });

      // Mock the current time for calculation
      const originalCalculateNextRun = tempReport.calculateNextRun;
      tempReport.calculateNextRun = function() {
        // Use the current iteration date
        const originalNow = Date.now;
        Date.now = () => currentDate.getTime();
        const result = originalCalculateNextRun.call(this);
        Date.now = originalNow;
        return result;
      };

      const nextRun = tempReport.calculateNextRun();
      nextRuns.push(nextRun);
      currentDate = nextRun;
    }

    return nextRuns;
  }
}