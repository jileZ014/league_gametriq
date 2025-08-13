import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { ScheduledReport } from './scheduled-report.entity';
import { ReportTemplate } from './report-template.entity';
import { ReportFormat, ReportDeliveryMethod } from './scheduled-report.entity';

export enum ReportStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  GENERATED = 'generated',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

export interface Recipient {
  email: string;
  name?: string;
  deliveredAt?: Date;
  deliveryStatus?: 'sent' | 'failed' | 'bounced';
}

export interface ErrorDetails {
  code?: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
}

@Entity('report_history')
@Index(['organizationId'])
@Index(['scheduledReportId'])
@Index(['status'])
@Index(['generatedAt'])
@Index(['expiresAt'])
export class ReportHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'scheduled_report_id', nullable: true })
  scheduledReportId?: string;

  @ManyToOne(() => ScheduledReport, (report) => report.reportHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scheduled_report_id' })
  scheduledReport?: ScheduledReport;

  @Column({ name: 'template_id', nullable: true })
  templateId?: string;

  @ManyToOne(() => ReportTemplate, (template) => template.reportHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template?: ReportTemplate;

  @Column({ type: 'varchar', length: 255, name: 'report_name' })
  reportName: string;

  @Column({
    type: 'enum',
    enum: ReportFormat,
  })
  format: ReportFormat;

  @Column({ type: 'text', nullable: true, name: 'file_url' })
  fileUrl?: string;

  @Column({ type: 'integer', nullable: true, name: 'file_size' })
  fileSize?: number;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'file_hash' })
  fileHash?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 's3_bucket' })
  s3Bucket?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 's3_key' })
  s3Key?: string;

  @Column({ type: 'integer', nullable: true, name: 'generation_time_ms' })
  generationTimeMs?: number;

  @Column({ type: 'integer', nullable: true, name: 'delivery_time_ms' })
  deliveryTimeMs?: number;

  @Column({ type: 'timestamptz', name: 'generated_at', default: () => 'NOW()' })
  generatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'delivered_at' })
  deliveredAt?: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'expires_at' })
  expiresAt?: Date;

  @Column({ type: 'jsonb', default: [] })
  recipients: Recipient[];

  @Column({
    type: 'enum',
    enum: ReportDeliveryMethod,
    nullable: true,
    name: 'delivery_method',
  })
  deliveryMethod?: ReportDeliveryMethod;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage?: string;

  @Column({ type: 'jsonb', nullable: true, name: 'error_details' })
  errorDetails?: ErrorDetails;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', default: {}, name: 'filters_applied' })
  filtersApplied: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true, name: 'data_snapshot' })
  dataSnapshot?: Record<string, any>;

  @Column({ type: 'integer', nullable: true, name: 'row_count' })
  rowCount?: number;

  @Column({ type: 'integer', nullable: true, name: 'page_count' })
  pageCount?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Helper methods
  markAsGenerating(): void {
    this.status = ReportStatus.GENERATING;
  }

  markAsGenerated(fileUrl: string, fileSize?: number): void {
    this.status = ReportStatus.GENERATED;
    this.fileUrl = fileUrl;
    this.fileSize = fileSize;
  }

  markAsDelivered(deliveryTimeMs?: number): void {
    this.status = ReportStatus.DELIVERED;
    this.deliveredAt = new Date();
    if (deliveryTimeMs) {
      this.deliveryTimeMs = deliveryTimeMs;
    }
  }

  markAsFailed(errorMessage: string, errorDetails?: ErrorDetails): void {
    this.status = ReportStatus.FAILED;
    this.errorMessage = errorMessage;
    this.errorDetails = errorDetails;
  }

  isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  getFileExtension(): string {
    switch (this.format) {
      case ReportFormat.PDF:
        return 'pdf';
      case ReportFormat.HTML:
        return 'html';
      case ReportFormat.EXCEL:
        return 'xlsx';
      case ReportFormat.CSV:
        return 'csv';
      default:
        return 'pdf';
    }
  }

  getContentType(): string {
    switch (this.format) {
      case ReportFormat.PDF:
        return 'application/pdf';
      case ReportFormat.HTML:
        return 'text/html';
      case ReportFormat.EXCEL:
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case ReportFormat.CSV:
        return 'text/csv';
      default:
        return 'application/pdf';
    }
  }

  calculateSuccessRate(): number {
    const totalRecipients = this.recipients.length;
    if (totalRecipients === 0) return 100;

    const successfulDeliveries = this.recipients.filter(
      (r) => r.deliveryStatus === 'sent'
    ).length;

    return (successfulDeliveries / totalRecipients) * 100;
  }

  addRecipientDeliveryStatus(email: string, status: 'sent' | 'failed' | 'bounced'): void {
    const recipient = this.recipients.find((r) => r.email === email);
    if (recipient) {
      recipient.deliveryStatus = status;
      recipient.deliveredAt = new Date();
    }
  }

  setDataSnapshot(leagues: number, games: number, teams: number, players: number): void {
    this.dataSnapshot = {
      leagues,
      games,
      teams,
      players,
      generatedAt: new Date(),
    };
  }

  formatFileSize(): string {
    if (!this.fileSize) return 'Unknown';

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = this.fileSize;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}