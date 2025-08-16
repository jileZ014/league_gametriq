import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { GameProcessor } from './processors/game.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { ScheduleProcessor } from './processors/schedule.processor';
import { ReportProcessor } from './processors/report.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'games' },
      { name: 'notifications' },
      { name: 'schedule-generation' },
      { name: 'reports' }
    ),
  ],
  controllers: [QueueController],
  providers: [
    QueueService,
    GameProcessor,
    NotificationProcessor,
    ScheduleProcessor,
    ReportProcessor,
  ],
  exports: [QueueService]
})
export class QueueModule {}