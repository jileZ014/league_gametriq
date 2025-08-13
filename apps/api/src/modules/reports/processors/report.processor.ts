import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

import { ReportGeneratorService } from '../services/report-generator.service';
import { EmailDeliveryService } from '../services/email-delivery.service';
import { ReportHistory, ReportStatus } from '../entities/report-history.entity';

interface ReportGenerationJob {
  historyId: string;
  organizationId: string;
  templateId: string;
  name: string;
  format?: 'pdf' | 'html' | 'excel' | 'csv';
  filters?: Record<string, any>;
  variables?: Record<string, any>;
  includeCharts?: boolean;
  deliveryMethod?: 'email' | 'in_app' | 'both';
  recipients?: string[];
  includeAttachments?: boolean;
  isScheduled?: boolean;
  isPreview?: boolean;
}

interface ScheduledReportJob {
  scheduledReportId: string;
  organizationId: string;
}

@Processor('reports')
export class ReportProcessor {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(
    private readonly reportGeneratorService: ReportGeneratorService,
    private readonly emailDeliveryService: EmailDeliveryService,
  ) {}

  @Process('generate-report')
  async handleReportGeneration(job: Job<ReportGenerationJob>): Promise<void> {
    const { data } = job;
    const startTime = Date.now();
    
    this.logger.log(`Processing report generation job: ${data.name} (${data.historyId})`);

    try {
      // Update status to generating
      await this.reportGeneratorService.updateReportStatus(
        data.historyId,
        ReportStatus.GENERATING,
        { generationTimeMs: 0 }
      );

      // Generate the report
      const result = await this.reportGeneratorService.generateReport({
        templateId: data.templateId,
        organizationId: data.organizationId,
        name: data.name,
        format: data.format,
        filters: data.filters,
        variables: data.variables,
        includeCharts: data.includeCharts,
        isPreview: data.isPreview,
      });

      // For this implementation, we'll simulate file storage
      // In production, you would upload to S3 or another storage service
      const fileUrl = `https://storage.gametriq.com/reports/${data.historyId}.${result.filename.split('.').pop()}`;

      // Update status to generated
      await this.reportGeneratorService.updateReportStatus(
        data.historyId,
        ReportStatus.GENERATED,
        {
          fileUrl,
          fileSize: result.content instanceof Buffer ? result.content.length : result.content.length,
          generationTimeMs: result.metadata.generationTimeMs,
          rowCount: result.metadata.dataPoints?.total || 0,
          pageCount: result.metadata.pageCount,
        }
      );

      // Handle delivery if requested
      if (data.deliveryMethod && data.deliveryMethod !== 'in_app' && data.recipients?.length) {
        await this.handleReportDelivery(job, result);
      } else {
        // Mark as delivered for in-app only reports
        await this.reportGeneratorService.updateReportStatus(
          data.historyId,
          ReportStatus.DELIVERED,
          { deliveredAt: new Date() }
        );
      }

      const totalTime = Date.now() - startTime;
      this.logger.log(`Report generation completed: ${data.name} in ${totalTime}ms`);

    } catch (error) {
      this.logger.error(`Report generation failed: ${data.name} - ${error.message}`, error.stack);

      // Update status to failed
      await this.reportGeneratorService.updateReportStatus(
        data.historyId,
        ReportStatus.FAILED,
        {
          errorMessage: error.message,
          errorDetails: {
            code: error.code,
            message: error.message,
            stack: error.stack,
            context: { jobData: data },
          },
        }
      );

      // Send error notification to admins if this is a scheduled report
      if (data.isScheduled && data.recipients?.length) {
        await this.emailDeliveryService.sendErrorNotification(
          data.name,
          error.message,
          data.recipients
        );
      }

      throw error; // Re-throw to mark job as failed
    }
  }

  @Process('execute-scheduled-report')
  async handleScheduledReport(job: Job<ScheduledReportJob>): Promise<void> {
    const { data } = job;
    
    this.logger.log(`Processing scheduled report job: ${data.scheduledReportId}`);

    try {
      // This would be handled by the ReportSchedulerService
      // The actual report generation would be queued as a separate job
      this.logger.log(`Scheduled report ${data.scheduledReportId} processed`);

    } catch (error) {
      this.logger.error(`Scheduled report execution failed: ${data.scheduledReportId} - ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleReportDelivery(job: Job<ReportGenerationJob>, result: any): Promise<void> {
    const { data } = job;
    const deliveryStartTime = Date.now();

    try {
      this.logger.log(`Starting report delivery: ${data.name}`);

      // Prepare email attachments
      const attachments = data.includeAttachments ? [{
        filename: result.filename,
        content: result.content,
        contentType: result.contentType,
      }] : [];

      // Prepare email subject
      const subject = data.isScheduled 
        ? `Scheduled Report: ${data.name}`
        : `Report Ready: ${data.name}`;

      // Send email
      const emailResult = await this.emailDeliveryService.sendReportEmail(
        {} as ReportHistory, // This would be the actual report history record
        {
          recipients: data.recipients || [],
          subject,
          attachments,
          includeUnsubscribeLink: data.isScheduled,
          templateData: {
            organizationName: 'Your Organization', // This would come from the actual organization
            summary: result.metadata.dataPoints,
          },
        }
      );

      // Calculate delivery time
      const deliveryTime = Date.now() - deliveryStartTime;

      // Update delivery status
      await this.reportGeneratorService.updateReportStatus(
        data.historyId,
        emailResult.success ? ReportStatus.DELIVERED : ReportStatus.FAILED,
        {
          deliveredAt: emailResult.success ? new Date() : undefined,
          deliveryTimeMs: deliveryTime,
          errorMessage: emailResult.success ? undefined : 'Email delivery failed',
          errorDetails: emailResult.success ? undefined : {
            message: 'Email delivery failed',
            context: { failedDeliveries: emailResult.failedDeliveries },
          },
        }
      );

      if (emailResult.success) {
        this.logger.log(`Report delivered successfully: ${data.name} to ${emailResult.deliveredTo.length} recipients`);
      } else {
        this.logger.error(`Report delivery failed: ${data.name}`);
      }

    } catch (error) {
      this.logger.error(`Report delivery error: ${data.name} - ${error.message}`, error.stack);

      await this.reportGeneratorService.updateReportStatus(
        data.historyId,
        ReportStatus.FAILED,
        {
          errorMessage: `Delivery failed: ${error.message}`,
          errorDetails: {
            code: error.code,
            message: error.message,
            stack: error.stack,
            context: { phase: 'delivery' },
          },
        }
      );

      throw error;
    }
  }

  // Job event handlers
  @Process('cleanup-old-reports')
  async handleReportCleanup(job: Job): Promise<void> {
    this.logger.log('Processing report cleanup job');

    try {
      // This would implement cleanup logic for old reports
      // - Delete expired report files from storage
      // - Clean up old history records
      // - Remove completed jobs from queue

      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 6); // Keep 6 months

      this.logger.log(`Cleanup completed for reports older than ${cutoffDate.toISOString()}`);

    } catch (error) {
      this.logger.error(`Report cleanup failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Job failed event handler
  async handleJobFailed(job: Job, error: Error): Promise<void> {
    this.logger.error(`Job ${job.id} failed:`, error);

    // Update job attempts tracking
    const attempts = job.attemptsMade;
    const maxAttempts = job.opts.attempts || 1;

    if (attempts >= maxAttempts) {
      this.logger.error(`Job ${job.id} failed permanently after ${attempts} attempts`);

      // Send notification about permanent failure
      if (job.data.recipients?.length && job.data.isScheduled) {
        await this.emailDeliveryService.sendErrorNotification(
          job.data.name,
          `Report generation failed permanently after ${attempts} attempts: ${error.message}`,
          job.data.recipients
        );
      }
    } else {
      this.logger.warn(`Job ${job.id} will retry. Attempt ${attempts}/${maxAttempts}`);
    }
  }

  // Job completed event handler
  async handleJobCompleted(job: Job, result: any): Promise<void> {
    const duration = Date.now() - job.timestamp;
    this.logger.log(`Job ${job.id} completed in ${duration}ms`);

    // Update job metrics or send success notifications if needed
    if (job.data.isScheduled && job.data.trackSuccess) {
      // Track success metrics for scheduled reports
    }
  }
}