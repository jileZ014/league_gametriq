import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { ReportTemplate } from './entities/report-template.entity';
import { ScheduledReport } from './entities/scheduled-report.entity';
import { ReportHistory } from './entities/report-history.entity';
import { ReportSubscription } from './entities/report-subscription.entity';

// Services
import { ReportsService } from './reports.service';
import { ReportGeneratorService } from './services/report-generator.service';
import { ReportSchedulerService } from './services/report-scheduler.service';
import { ReportTemplatesService } from './services/report-templates.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { EmailDeliveryService } from './services/email-delivery.service';
import { DataExtractionService } from './services/data-extraction.service';

// Controllers
import { ReportsController } from './reports.controller';

// Processors
import { ReportProcessor } from './processors/report.processor';

// Templates
import { LeagueSummaryTemplate } from './templates/league-summary.template';
import { FinancialSummaryTemplate } from './templates/financial-summary.template';
import { GameResultsTemplate } from './templates/game-results.template';
import { AttendanceTemplate } from './templates/attendance.template';
import { BaseTemplate } from './templates/base.template';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReportTemplate,
      ScheduledReport,
      ReportHistory,
      ReportSubscription,
    ]),
    BullModule.registerQueue({
      name: 'reports',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    ScheduleModule,
  ],
  controllers: [ReportsController],
  providers: [
    // Main service
    ReportsService,
    
    // Core services
    ReportGeneratorService,
    ReportSchedulerService,
    ReportTemplatesService,
    PdfGeneratorService,
    EmailDeliveryService,
    DataExtractionService,
    
    // Queue processor
    ReportProcessor,
    
    // Template engines
    BaseTemplate,
    LeagueSummaryTemplate,
    FinancialSummaryTemplate,
    GameResultsTemplate,
    AttendanceTemplate,
  ],
  exports: [
    ReportsService,
    ReportGeneratorService,
    ReportSchedulerService,
    ReportTemplatesService,
  ],
})
export class ReportsModule {}