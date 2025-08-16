import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AppScheduleService } from './app-schedule.service';
import { AppScheduleController } from './app-schedule.controller';
import { Schedule } from './entities/schedule.entity';
import { ScheduleTemplate } from './entities/schedule-template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Schedule, ScheduleTemplate]),
    BullModule.registerQueue({
      name: 'schedule-generation',
    }),
  ],
  controllers: [AppScheduleController],
  providers: [AppScheduleService],
  exports: [AppScheduleService]
})
export class AppScheduleModule {}