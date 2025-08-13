import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { ReportTemplate } from './report-template.entity';
import { ReportHistory } from './report-history.entity';
import { ReportSubscription } from './report-subscription.entity';

export enum ReportScheduleType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export enum ReportDeliveryMethod {
  EMAIL = 'email',
  IN_APP = 'in_app',
  BOTH = 'both',
}

export enum ReportFormat {
  PDF = 'pdf',
  HTML = 'html',
  EXCEL = 'excel',
  CSV = 'csv',
}

export interface ScheduleConfig {
  cronExpression?: string;
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
  hour?: number; // 0-23
  minute?: number; // 0-59
  timezone?: string;
}

export interface Recipient {
  type: 'email' | 'role' | 'user';
  value: string;
  name?: string;
}

@Entity('scheduled_reports')
@Index(['organizationId'])
@Index(['leagueId'])
@Index(['isActive'])
@Index(['nextRun'])
@Index(['templateId'])
export class ScheduledReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'template_id' })
  templateId: string;

  @ManyToOne(() => ReportTemplate, (template) => template.scheduledReports, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: ReportTemplate;

  @Column({ name: 'league_id', nullable: true })
  leagueId?: string;

  @Column({ name: 'season_id', nullable: true })
  seasonId?: string;

  @Column({ name: 'division_id', nullable: true })
  divisionId?: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ReportScheduleType,
    name: 'schedule_type',
  })
  scheduleType: ReportScheduleType;

  @Column({ type: 'jsonb', default: {}, name: 'schedule_config' })
  scheduleConfig: ScheduleConfig;

  @Column({ type: 'jsonb', default: [] })
  recipients: Recipient[];

  @Column({
    type: 'enum',
    enum: ReportDeliveryMethod,
    default: ReportDeliveryMethod.EMAIL,
    name: 'delivery_method',
  })
  deliveryMethod: ReportDeliveryMethod;

  @Column({
    type: 'enum',
    enum: ReportFormat,
    default: ReportFormat.PDF,
  })
  format: ReportFormat;

  @Column({ type: 'jsonb', default: {} })
  filters: Record<string, any>;

  @Column({ type: 'boolean', default: true, name: 'include_attachments' })
  includeAttachments: boolean;

  @Column({ type: 'boolean', default: true, name: 'include_charts' })
  includeCharts: boolean;

  @Column({ type: 'varchar', length: 50, default: 'America/Phoenix' })
  timezone: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_run' })
  lastRun?: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_success' })
  lastSuccess?: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_failure' })
  lastFailure?: Date;

  @Column({ type: 'integer', default: 0, name: 'failure_count' })
  failureCount: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'next_run' })
  nextRun?: Date;

  @Column({ type: 'integer', default: 0, name: 'retry_count' })
  retryCount: number;

  @Column({ type: 'integer', default: 3, name: 'max_retries' })
  maxRetries: number;

  @Column({ name: 'created_by' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ReportHistory, (history) => history.scheduledReport)
  reportHistory: ReportHistory[];

  @OneToMany(() => ReportSubscription, (subscription) => subscription.scheduledReport)
  subscriptions: ReportSubscription[];

  // Helper methods
  calculateNextRun(): Date {
    const now = new Date();
    const config = this.scheduleConfig;

    switch (this.scheduleType) {
      case ReportScheduleType.DAILY:
        const dailyNext = new Date(now);
        dailyNext.setDate(dailyNext.getDate() + 1);
        dailyNext.setHours(config.hour || 8, config.minute || 0, 0, 0);
        return dailyNext;

      case ReportScheduleType.WEEKLY:
        const weeklyNext = new Date(now);
        const daysUntilTarget = (config.dayOfWeek || 1) - weeklyNext.getDay();
        const daysToAdd = daysUntilTarget <= 0 ? daysUntilTarget + 7 : daysUntilTarget;
        weeklyNext.setDate(weeklyNext.getDate() + daysToAdd);
        weeklyNext.setHours(config.hour || 8, config.minute || 0, 0, 0);
        return weeklyNext;

      case ReportScheduleType.MONTHLY:
        const monthlyNext = new Date(now);
        monthlyNext.setMonth(monthlyNext.getMonth() + 1);
        monthlyNext.setDate(config.dayOfMonth || 1);
        monthlyNext.setHours(config.hour || 8, config.minute || 0, 0, 0);
        return monthlyNext;

      case ReportScheduleType.CUSTOM:
        // For custom, we'd use a cron parser
        // This is a simplified implementation
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);

      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  shouldRetry(): boolean {
    return this.retryCount < this.maxRetries;
  }

  incrementFailure(): void {
    this.failureCount++;
    this.retryCount++;
    this.lastFailure = new Date();
  }

  resetRetries(): void {
    this.retryCount = 0;
  }

  getRecipientEmails(): string[] {
    return this.recipients
      .filter((r) => r.type === 'email')
      .map((r) => r.value);
  }

  getRecipientRoles(): string[] {
    return this.recipients
      .filter((r) => r.type === 'role')
      .map((r) => r.value);
  }

  getRecipientUserIds(): string[] {
    return this.recipients
      .filter((r) => r.type === 'user')
      .map((r) => r.value);
  }
}