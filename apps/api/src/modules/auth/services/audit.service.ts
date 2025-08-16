import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

export interface AuditLogEntry {
  timestamp: string;
  userId?: string;
  eventType: string;
  metadata: Record<string, any>;
  ipHash?: string;
  userAgent?: string;
  isMinor?: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class AuditService {
  constructor(private configService: ConfigService) {}

  async logSecurityEvent(
    userId: string,
    eventType: string,
    metadata: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const logEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      userId,
      eventType,
      metadata,
      ipHash: ipAddress ? this.hashIpAddress(ipAddress) : undefined,
      userAgent: userAgent ? this.sanitizeUserAgent(userAgent) : undefined,
      isMinor: metadata.isMinor || false,
      severity: this.determineSeverity(eventType, metadata),
    };

    // Log to console (replace with proper audit logging in production)
    console.log('[SECURITY_AUDIT]', JSON.stringify(logEntry));

    // In production, this should:
    // 1. Write to a tamper-proof audit log
    // 2. Send alerts for critical events
    // 3. Store in a separate audit database
    // 4. Implement log rotation and retention policies
    
    await this.handleSpecialEvents(logEntry);
  }

  async logMinorDataAccess(
    userId: string,
    dataType: string,
    action: 'read' | 'write' | 'delete',
    ipAddress: string,
    userAgent: string,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    await this.logSecurityEvent(
      userId,
      'MINOR_DATA_ACCESS',
      {
        ...metadata,
        dataType,
        action,
        isMinor: true,
        complianceNote: 'COPPA protected data access',
      },
      ipAddress,
      userAgent,
    );
  }

  async logParentalConsentEvent(
    childUserId: string,
    parentUserId: string,
    action: 'granted' | 'revoked' | 'expired',
    metadata: Record<string, any> = {},
  ): Promise<void> {
    await this.logSecurityEvent(
      childUserId,
      'PARENTAL_CONSENT_EVENT',
      {
        ...metadata,
        parentUserId,
        action,
        isMinor: true,
        complianceNote: 'COPPA parental consent action',
      },
    );
  }

  async logDataRetentionEvent(
    userId: string,
    action: 'scheduled_deletion' | 'deleted' | 'retention_extended',
    dataTypes: string[],
    metadata: Record<string, any> = {},
  ): Promise<void> {
    await this.logSecurityEvent(
      userId,
      'DATA_RETENTION_EVENT',
      {
        ...metadata,
        action,
        dataTypes,
        isMinor: metadata.isMinor || false,
        complianceNote: 'Data retention policy action',
      },
    );
  }

  private hashIpAddress(ipAddress: string): string {
    const salt = this.configService.get('security.ipSalt', 'default-salt');
    return createHash('sha256').update(ipAddress + salt).digest('hex');
  }

  private sanitizeUserAgent(userAgent: string): string {
    // Remove potentially sensitive information from user agent
    return userAgent
      .replace(/\([^)]*\)/g, '(sanitized)')
      .substring(0, 200);
  }

  private determineSeverity(
    eventType: string,
    metadata: Record<string, any>,
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical events that require immediate attention
    const criticalEvents = [
      'ACCOUNT_LOCKED',
      'MULTIPLE_FAILED_LOGINS',
      'MINOR_DATA_BREACH_ATTEMPT',
      'UNAUTHORIZED_MINOR_ACCESS',
      'PARENTAL_CONSENT_VIOLATION',
    ];

    // High severity events
    const highSeverityEvents = [
      'PASSWORD_RESET_COMPLETED',
      'MFA_DISABLED',
      'MINOR_ACCOUNT_CREATED',
      'MINOR_DATA_ACCESS',
      'SESSION_HIJACK_ATTEMPT',
    ];

    // Medium severity events
    const mediumSeverityEvents = [
      'LOGIN_SUCCESS',
      'MFA_ENABLED',
      'PASSWORD_CHANGED',
      'MINOR_LOGIN_ATTEMPT',
      'PARENTAL_CONSENT_EVENT',
    ];

    if (criticalEvents.includes(eventType)) {
      return 'critical';
    }

    if (highSeverityEvents.includes(eventType)) {
      return 'high';
    }

    if (mediumSeverityEvents.includes(eventType)) {
      return 'medium';
    }

    // Special severity rules for minor-related events
    if (metadata.isMinor) {
      if (eventType.includes('FAILED') || eventType.includes('ATTEMPT')) {
        return 'high';
      }
      return 'medium';
    }

    return 'low';
  }

  private async handleSpecialEvents(logEntry: AuditLogEntry): Promise<void> {
    // Handle critical events that require immediate action
    if (logEntry.severity === 'critical') {
      await this.sendCriticalAlert(logEntry);
    }

    // Handle minor-specific events
    if (logEntry.isMinor) {
      await this.handleMinorEvent(logEntry);
    }

    // Handle failed login attempts
    if (logEntry.eventType === 'LOGIN_FAILED' && logEntry.metadata.consecutiveFailures >= 3) {
      await this.handleSuspiciousActivity(logEntry);
    }
  }

  private async sendCriticalAlert(logEntry: AuditLogEntry): Promise<void> {
    // In production, this would:
    // 1. Send alerts to security team
    // 2. Create incident tickets
    // 3. Potentially trigger automated responses
    console.log('[CRITICAL_ALERT]', {
      message: 'Critical security event detected',
      eventType: logEntry.eventType,
      userId: logEntry.userId,
      timestamp: logEntry.timestamp,
    });
  }

  private async handleMinorEvent(logEntry: AuditLogEntry): Promise<void> {
    // Enhanced monitoring for minor-related events
    // This ensures COPPA compliance and child safety
    console.log('[MINOR_MONITORING]', {
      message: 'Minor account activity',
      eventType: logEntry.eventType,
      userId: logEntry.userId,
      timestamp: logEntry.timestamp,
      metadata: logEntry.metadata,
    });

    // In production, this might:
    // 1. Notify parents of certain activities
    // 2. Apply additional restrictions
    // 3. Schedule automated compliance checks
  }

  private async handleSuspiciousActivity(logEntry: AuditLogEntry): Promise<void> {
    // Handle patterns that might indicate attacks or abuse
    console.log('[SUSPICIOUS_ACTIVITY]', {
      message: 'Suspicious activity pattern detected',
      eventType: logEntry.eventType,
      userId: logEntry.userId,
      ipHash: logEntry.ipHash,
      timestamp: logEntry.timestamp,
    });

    // In production, this might:
    // 1. Temporarily block IP addresses
    // 2. Require additional verification
    // 3. Alert security team
  }

  // Method to retrieve audit logs (for compliance reporting)
  async getAuditLogs(
    filters: {
      userId?: string;
      eventType?: string;
      isMinor?: boolean;
      startDate?: Date;
      endDate?: Date;
      severity?: string;
    },
    limit: number = 100,
  ): Promise<AuditLogEntry[]> {
    // In production, this would query the audit database
    // For now, return empty array as logs are stored elsewhere
    console.log('[AUDIT_QUERY]', { filters, limit });
    return [];
  }
}