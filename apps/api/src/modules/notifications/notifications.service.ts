import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Notification } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationTemplate)
    private templateRepository: Repository<NotificationTemplate>,
    @InjectQueue('notifications')
    private notificationQueue: Queue,
  ) {}

  async findAll(userId: string) {
    return this.notificationRepository.find({ 
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }

  async findUnread(userId: string) {
    return this.notificationRepository.find({ 
      where: { userId, isRead: false },
      order: { createdAt: 'DESC' }
    });
  }

  async create(data: any) {
    const notification = this.notificationRepository.create(data);
    const saved = await this.notificationRepository.save(notification);
    
    // Queue for processing (email, push, etc)
    await this.notificationQueue.add('send', {
      notificationId: saved.id,
      type: data.type,
      channel: data.channel || 'in-app'
    });
    
    return saved;
  }

  async markAsRead(id: string, userId: string) {
    await this.notificationRepository.update(
      { id, userId },
      { isRead: true, readAt: new Date() }
    );
    return this.notificationRepository.findOne({ where: { id, userId } });
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  async delete(id: string, userId: string) {
    await this.notificationRepository.delete({ id, userId });
  }

  async sendBulkNotification(templateId: string, userIds: string[], data: any) {
    const template = await this.templateRepository.findOne({ where: { id: templateId } });
    if (!template) {
      throw new Error('Template not found');
    }

    const notifications = userIds.map(userId => ({
      userId,
      title: this.processTemplate(template.title, data),
      message: this.processTemplate(template.body, data),
      type: template.type,
      metadata: data
    }));

    return Promise.all(notifications.map(n => this.create(n)));
  }

  private processTemplate(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
  }
}