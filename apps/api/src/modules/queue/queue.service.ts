import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('games') private gamesQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
    @InjectQueue('schedule-generation') private scheduleQueue: Queue,
    @InjectQueue('reports') private reportsQueue: Queue,
  ) {}

  async addGameJob(jobName: string, data: any, options?: any) {
    return this.gamesQueue.add(jobName, data, options);
  }

  async addNotificationJob(jobName: string, data: any, options?: any) {
    return this.notificationsQueue.add(jobName, data, options);
  }

  async addScheduleJob(jobName: string, data: any, options?: any) {
    return this.scheduleQueue.add(jobName, data, options);
  }

  async addReportJob(jobName: string, data: any, options?: any) {
    return this.reportsQueue.add(jobName, data, options);
  }

  async getQueueStatus(queueName: string) {
    let queue: Queue;
    
    switch (queueName) {
      case 'games':
        queue = this.gamesQueue;
        break;
      case 'notifications':
        queue = this.notificationsQueue;
        break;
      case 'schedule-generation':
        queue = this.scheduleQueue;
        break;
      case 'reports':
        queue = this.reportsQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      name: queueName,
      counts: {
        waiting,
        active,
        completed,
        failed,
        delayed,
      },
    };
  }

  async getAllQueuesStatus() {
    const queues = ['games', 'notifications', 'schedule-generation', 'reports'];
    return Promise.all(queues.map(q => this.getQueueStatus(q)));
  }

  async cleanQueue(queueName: string, grace: number = 0) {
    let queue: Queue;
    
    switch (queueName) {
      case 'games':
        queue = this.gamesQueue;
        break;
      case 'notifications':
        queue = this.notificationsQueue;
        break;
      case 'schedule-generation':
        queue = this.scheduleQueue;
        break;
      case 'reports':
        queue = this.reportsQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
  }
}