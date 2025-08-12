import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Request } from 'express';
import { AuditLog, AuditAction, AuditEventStatus, AuditMetadata } from './audit.entity';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';

export interface AuditContext {
  organizationId?: string;
  userId?: string;
  request?: Request;
  entityType?: string;
  entityId?: string;
}

export interface CreateAuditLogDto {
  action: AuditAction;
  status?: AuditEventStatus;
  description?: string;
  context?: AuditContext;
  metadata?: AuditMetadata;
  durationMs?: number;
}

export interface AuditLogFilter {
  organizationId?: string;
  userId?: string;
  action?: AuditAction | AuditAction[];
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: AuditEventStatus;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly retentionDays: number;
  private readonly batchSize: number = 1000;

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly configService: ConfigService,
  ) {
    this.retentionDays = this.configService.get<number>('audit.retentionDays', 90);
  }

  /**
   * Create a new audit log entry
   */
  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    const startTime = Date.now();
    
    try {
      const auditLog = this.auditLogRepository.create({
        action: dto.action,
        status: dto.status || AuditEventStatus.INFO,
        description: dto.description || this.generateDescription(dto.action),
        organizationId: dto.context?.organizationId,
        userId: dto.context?.userId,
        entityType: dto.context?.entityType,
        entityId: dto.context?.entityId,
        ipAddress: this.extractIpAddress(dto.context?.request),
        userAgent: this.extractUserAgent(dto.context?.request),
        requestMethod: dto.context?.request?.method,
        requestUrl: this.sanitizeUrl(dto.context?.request?.originalUrl),
        metadata: this.sanitizeMetadata(dto.metadata),
        durationMs: dto.durationMs,
        expiresAt: this.calculateExpiryDate(),
      });

      const saved = await this.auditLogRepository.save(auditLog);
      
      // Log performance metrics
      const totalTime = Date.now() - startTime;
      if (totalTime > 5) {
        this.logger.warn(`Audit log creation took ${totalTime}ms`, {
          action: dto.action,
          totalTime,
        });
      }

      return saved;
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
      // Don't throw - audit logging should not break the main flow
      return null;
    }
  }

  /**
   * Log a successful action
   */
  async logSuccess(
    action: AuditAction,
    context: AuditContext,
    metadata?: AuditMetadata,
    description?: string,
  ): Promise<AuditLog> {
    return this.log({
      action,
      status: AuditEventStatus.SUCCESS,
      description,
      context,
      metadata,
    });
  }

  /**
   * Log a failed action
   */
  async logFailure(
    action: AuditAction,
    context: AuditContext,
    error: Error | string,
    metadata?: AuditMetadata,
  ): Promise<AuditLog> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorMetadata = {
      ...metadata,
      errorMessage,
      errorCode: (error as any)?.code,
    };

    return this.log({
      action,
      status: AuditEventStatus.FAILURE,
      description: errorMessage,
      context,
      metadata: errorMetadata,
    });
  }

  /**
   * Query audit logs with filters
   */
  async findLogs(filter: AuditLogFilter): Promise<{ logs: AuditLog[]; total: number }> {
    const query = this.auditLogRepository.createQueryBuilder('audit');

    if (filter.organizationId) {
      query.andWhere('audit.organization_id = :orgId', { orgId: filter.organizationId });
    }

    if (filter.userId) {
      query.andWhere('audit.user_id = :userId', { userId: filter.userId });
    }

    if (filter.action) {
      if (Array.isArray(filter.action)) {
        query.andWhere('audit.action IN (:...actions)', { actions: filter.action });
      } else {
        query.andWhere('audit.action = :action', { action: filter.action });
      }
    }

    if (filter.entityType && filter.entityId) {
      query.andWhere('audit.entity_type = :entityType AND audit.entity_id = :entityId', {
        entityType: filter.entityType,
        entityId: filter.entityId,
      });
    }

    if (filter.status) {
      query.andWhere('audit.status = :status', { status: filter.status });
    }

    if (filter.startDate) {
      query.andWhere('audit.created_at >= :startDate', { startDate: filter.startDate });
    }

    if (filter.endDate) {
      query.andWhere('audit.created_at <= :endDate', { endDate: filter.endDate });
    }

    const total = await query.getCount();

    query.orderBy('audit.created_at', 'DESC');

    if (filter.limit) {
      query.limit(filter.limit);
    }

    if (filter.offset) {
      query.offset(filter.offset);
    }

    const logs = await query.getMany();

    return { logs, total };
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityHistory(
    entityType: string,
    entityId: string,
    limit: number = 50,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: {
        entityType,
        entityId,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * Clean up expired audit logs (runs daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredLogs(): Promise<void> {
    this.logger.log('Starting audit log cleanup');
    
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - this.retentionDays);

      const result = await this.auditLogRepository.delete({
        createdAt: LessThan(expiryDate),
      });

      this.logger.log(`Deleted ${result.affected} expired audit logs`);
    } catch (error) {
      this.logger.error('Failed to cleanup audit logs', error);
    }
  }

  /**
   * Archive old audit logs (runs weekly)
   */
  @Cron(CronExpression.EVERY_WEEK)
  async archiveOldLogs(): Promise<void> {
    // Implementation would depend on your archive storage strategy
    // This is a placeholder for the archive logic
    this.logger.log('Archiving old audit logs - not implemented');
  }

  /**
   * Generate a description based on the action
   */
  private generateDescription(action: AuditAction): string {
    const actionMap: Record<AuditAction, string> = {
      [AuditAction.REGISTRATION_STARTED]: 'Registration process started',
      [AuditAction.REGISTRATION_COMPLETED]: 'Registration completed successfully',
      [AuditAction.REGISTRATION_FAILED]: 'Registration failed',
      [AuditAction.REGISTRATION_UPDATED]: 'Registration information updated',
      [AuditAction.REGISTRATION_CANCELLED]: 'Registration cancelled',
      [AuditAction.PAYMENT_INITIATED]: 'Payment initiated',
      [AuditAction.PAYMENT_PROCESSING]: 'Payment being processed',
      [AuditAction.PAYMENT_COMPLETED]: 'Payment completed successfully',
      [AuditAction.PAYMENT_FAILED]: 'Payment failed',
      [AuditAction.PAYMENT_METHOD_ADDED]: 'Payment method added',
      [AuditAction.PAYMENT_METHOD_REMOVED]: 'Payment method removed',
      [AuditAction.REFUND_REQUESTED]: 'Refund requested',
      [AuditAction.REFUND_APPROVED]: 'Refund approved',
      [AuditAction.REFUND_REJECTED]: 'Refund rejected',
      [AuditAction.REFUND_PROCESSING]: 'Refund being processed',
      [AuditAction.REFUND_COMPLETED]: 'Refund completed',
      [AuditAction.REFUND_FAILED]: 'Refund failed',
      [AuditAction.USER_LOGIN]: 'User logged in',
      [AuditAction.USER_LOGOUT]: 'User logged out',
      [AuditAction.USER_PROFILE_UPDATED]: 'User profile updated',
      [AuditAction.USER_PASSWORD_CHANGED]: 'User password changed',
      [AuditAction.USER_EMAIL_VERIFIED]: 'User email verified',
      [AuditAction.ADMIN_ACCESS]: 'Admin panel accessed',
      [AuditAction.ADMIN_CONFIGURATION_CHANGED]: 'Admin configuration changed',
      [AuditAction.ADMIN_USER_MODIFIED]: 'Admin modified user',
      [AuditAction.ADMIN_PERMISSION_CHANGED]: 'Admin permission changed',
    };

    return actionMap[action] || 'Unknown action';
  }

  /**
   * Extract IP address from request
   */
  private extractIpAddress(request?: Request): string {
    if (!request) return null;

    // Check for forwarded IP addresses
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }

    // Check for real IP header
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }

    // Fall back to request IP
    return request.ip || request.socket?.remoteAddress || null;
  }

  /**
   * Extract user agent from request
   */
  private extractUserAgent(request?: Request): string {
    if (!request) return null;
    return request.headers['user-agent'] || null;
  }

  /**
   * Sanitize URL to remove sensitive query parameters
   */
  private sanitizeUrl(url?: string): string {
    if (!url) return null;

    try {
      const urlObj = new URL(url, 'http://localhost');
      const sensitiveParams = ['token', 'key', 'secret', 'password', 'api_key', 'apikey'];
      
      sensitiveParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      });

      return urlObj.pathname + urlObj.search;
    } catch {
      return url;
    }
  }

  /**
   * Sanitize metadata to remove PII
   */
  private sanitizeMetadata(metadata?: AuditMetadata): AuditMetadata {
    if (!metadata) return null;

    const sanitized = { ...metadata };
    const piiFields = [
      'ssn',
      'socialSecurityNumber',
      'creditCard',
      'cardNumber',
      'cvv',
      'pin',
      'accountNumber',
      'routingNumber',
      'password',
      'secret',
      'privateKey',
    ];

    // Remove PII fields
    piiFields.forEach(field => {
      delete sanitized[field];
    });

    // Mask credit card numbers to last 4 digits
    if (sanitized.paymentLast4 && sanitized.paymentLast4.length > 4) {
      sanitized.paymentLast4 = sanitized.paymentLast4.slice(-4);
    }

    return sanitized;
  }

  /**
   * Calculate expiry date for audit log
   */
  private calculateExpiryDate(): Date {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + this.retentionDays);
    return expiryDate;
  }

  /**
   * Generate checksum for audit log integrity
   */
  private generateChecksum(data: any): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }
}