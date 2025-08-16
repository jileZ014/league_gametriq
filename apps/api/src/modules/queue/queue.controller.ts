import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { QueueService } from './queue.service';

@ApiTags('queues')
@Controller('queues')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get all queues status' })
  getAllStatus() {
    return this.queueService.getAllQueuesStatus();
  }

  @Get('status/:name')
  @ApiOperation({ summary: 'Get specific queue status' })
  getQueueStatus(@Param('name') name: string) {
    return this.queueService.getQueueStatus(name);
  }

  @Post(':name/clean')
  @ApiOperation({ summary: 'Clean completed and failed jobs from queue' })
  cleanQueue(@Param('name') name: string, @Body() body: { grace?: number }) {
    return this.queueService.cleanQueue(name, body.grace || 0);
  }

  @Post('games/job')
  @ApiOperation({ summary: 'Add job to games queue' })
  addGameJob(@Body() body: { name: string; data: any; options?: any }) {
    return this.queueService.addGameJob(body.name, body.data, body.options);
  }

  @Post('notifications/job')
  @ApiOperation({ summary: 'Add job to notifications queue' })
  addNotificationJob(@Body() body: { name: string; data: any; options?: any }) {
    return this.queueService.addNotificationJob(body.name, body.data, body.options);
  }

  @Post('schedule/job')
  @ApiOperation({ summary: 'Add job to schedule queue' })
  addScheduleJob(@Body() body: { name: string; data: any; options?: any }) {
    return this.queueService.addScheduleJob(body.name, body.data, body.options);
  }

  @Post('reports/job')
  @ApiOperation({ summary: 'Add job to reports queue' })
  addReportJob(@Body() body: { name: string; data: any; options?: any }) {
    return this.queueService.addReportJob(body.name, body.data, body.options);
  }
}