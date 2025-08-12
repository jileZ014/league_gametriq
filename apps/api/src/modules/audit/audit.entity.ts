import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  // Registration Events
  REGISTRATION_STARTED = 'registration.started',
  REGISTRATION_COMPLETED = 'registration.completed',
  REGISTRATION_FAILED = 'registration.failed',
  REGISTRATION_UPDATED = 'registration.updated',
  REGISTRATION_CANCELLED = 'registration.cancelled',
  
  // Payment Events
  PAYMENT_INITIATED = 'payment.initiated',
  PAYMENT_PROCESSING = 'payment.processing',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_METHOD_ADDED = 'payment.method_added',
  PAYMENT_METHOD_REMOVED = 'payment.method_removed',
  
  // Refund Events
  REFUND_REQUESTED = 'refund.requested',
  REFUND_APPROVED = 'refund.approved',
  REFUND_REJECTED = 'refund.rejected',
  REFUND_PROCESSING = 'refund.processing',
  REFUND_COMPLETED = 'refund.completed',
  REFUND_FAILED = 'refund.failed',
  
  // User Events
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_PROFILE_UPDATED = 'user.profile_updated',
  USER_PASSWORD_CHANGED = 'user.password_changed',
  USER_EMAIL_VERIFIED = 'user.email_verified',
  
  // Admin Events
  ADMIN_ACCESS = 'admin.access',
  ADMIN_CONFIGURATION_CHANGED = 'admin.configuration_changed',
  ADMIN_USER_MODIFIED = 'admin.user_modified',
  ADMIN_PERMISSION_CHANGED = 'admin.permission_changed',
}

export enum AuditEventStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  WARNING = 'warning',
  INFO = 'info',
}

export interface AuditMetadata {
  // Request context
  requestId?: string;
  sessionId?: string;
  
  // Entity references
  entityType?: string;
  entityId?: string;
  
  // Additional context
  reason?: string;
  errorMessage?: string;
  errorCode?: string;
  
  // PII-safe payment details
  paymentMethod?: 'card' | 'ach' | 'wire' | 'check' | 'other';
  paymentLast4?: string;
  paymentAmount?: number;
  paymentCurrency?: string;
  
  // Refund details
  refundAmount?: number;
  refundReason?: string;
  
  // Any other safe metadata
  [key: string]: any;
}

@Entity('audit_logs')
@Index(['organizationId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
@Index(['entityType', 'entityId', 'createdAt'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', nullable: true })
  organizationId: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'enum', enum: AuditEventStatus, default: AuditEventStatus.INFO })
  status: AuditEventStatus;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'entity_type', nullable: true })
  entityType: string;

  @Column({ name: 'entity_id', nullable: true })
  entityId: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ name: 'request_method', nullable: true })
  requestMethod: string;

  @Column({ name: 'request_url', nullable: true })
  requestUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: AuditMetadata;

  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;
}

@Entity('audit_log_archives')
@Index(['organization_id', 'created_at'])
@Index(['created_at'])
export class AuditLogArchive {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', nullable: true })
  organizationId: string;

  @Column({ name: 'archive_date', type: 'date' })
  archiveDate: Date;

  @Column({ name: 'record_count', type: 'integer' })
  recordCount: number;

  @Column({ name: 'file_path' })
  filePath: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number;

  @Column({ name: 'checksum' })
  checksum: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}