import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ScheduledReport } from './scheduled-report.entity';
import { ReportFormat } from './scheduled-report.entity';

@Entity('report_subscriptions')
@Unique(['userId', 'scheduledReportId'])
@Index(['userId'])
@Index(['scheduledReportId'])
@Index(['isActive'])
@Index(['unsubscribeToken'])
export class ReportSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'scheduled_report_id' })
  scheduledReportId: string;

  @ManyToOne(() => ScheduledReport, (report) => report.subscriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scheduled_report_id' })
  scheduledReport: ScheduledReport;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'email_override' })
  emailOverride?: string;

  @Column({
    type: 'enum',
    enum: ReportFormat,
    nullable: true,
    name: 'format_preference',
  })
  formatPreference?: ReportFormat;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'unsubscribed_at' })
  unsubscribedAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true, name: 'unsubscribe_token' })
  unsubscribeToken?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  generateUnsubscribeToken(): string {
    const crypto = require('crypto');
    this.unsubscribeToken = crypto.randomBytes(32).toString('hex');
    return this.unsubscribeToken;
  }

  unsubscribe(): void {
    this.isActive = false;
    this.unsubscribedAt = new Date();
    if (!this.unsubscribeToken) {
      this.generateUnsubscribeToken();
    }
  }

  resubscribe(): void {
    this.isActive = true;
    this.unsubscribedAt = null;
  }

  getEffectiveEmail(userEmail: string): string {
    return this.emailOverride || userEmail;
  }

  getEffectiveFormat(defaultFormat: ReportFormat): ReportFormat {
    return this.formatPreference || defaultFormat;
  }
}