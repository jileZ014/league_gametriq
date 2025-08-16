import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Schedule } from './entities/schedule.entity';
import { ScheduleTemplate } from './entities/schedule-template.entity';

@Injectable()
export class AppScheduleService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(ScheduleTemplate)
    private templateRepository: Repository<ScheduleTemplate>,
    @InjectQueue('schedule-generation')
    private scheduleQueue: Queue,
  ) {}

  async findAll(filters?: any) {
    const query = this.scheduleRepository.createQueryBuilder('schedule');
    
    if (filters?.leagueId) {
      query.andWhere('schedule.leagueId = :leagueId', { leagueId: filters.leagueId });
    }
    
    if (filters?.seasonId) {
      query.andWhere('schedule.seasonId = :seasonId', { seasonId: filters.seasonId });
    }
    
    if (filters?.divisionId) {
      query.andWhere('schedule.divisionId = :divisionId', { divisionId: filters.divisionId });
    }
    
    return query.orderBy('schedule.startDate', 'ASC').getMany();
  }

  async findOne(id: string) {
    return this.scheduleRepository.findOne({ where: { id } });
  }

  async create(data: any) {
    const schedule = this.scheduleRepository.create(data);
    return this.scheduleRepository.save(schedule);
  }

  async update(id: string, data: any) {
    await this.scheduleRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.scheduleRepository.delete(id);
  }

  async generateSchedule(params: {
    leagueId: string;
    seasonId: string;
    divisionId: string;
    templateId?: string;
    startDate: Date;
    endDate: Date;
  }) {
    // Queue the schedule generation job
    const job = await this.scheduleQueue.add('generate', params, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    return {
      jobId: job.id,
      status: 'queued',
      message: 'Schedule generation has been queued'
    };
  }

  async getTemplates() {
    return this.templateRepository.find({ where: { isActive: true } });
  }

  async createTemplate(data: any) {
    const template = this.templateRepository.create(data);
    return this.templateRepository.save(template);
  }

  async applyTemplate(scheduleId: string, templateId: string) {
    const template = await this.templateRepository.findOne({ where: { id: templateId } });
    if (!template) {
      throw new Error('Template not found');
    }

    const schedule = await this.findOne(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    // Apply template rules to schedule
    const updatedSchedule = {
      ...schedule,
      settings: {
        ...schedule.settings,
        ...template.rules,
      },
    };

    return this.update(scheduleId, updatedSchedule);
  }
}