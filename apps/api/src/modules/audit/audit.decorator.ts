import { SetMetadata } from '@nestjs/common';
import { AuditAction } from './audit.entity';

export const AUDIT_KEY = 'audit';

export interface AuditOptions {
  action: AuditAction;
  entityType?: string;
  extractEntityId?: (data: any) => string;
  includeResponse?: boolean;
  includeRequestBody?: boolean;
  sensitiveFields?: string[];
}

/**
 * Decorator to automatically log audit events for controller methods
 * 
 * @example
 * @Audit({ 
 *   action: AuditAction.PAYMENT_COMPLETED,
 *   entityType: 'payment',
 *   extractEntityId: (result) => result.paymentId
 * })
 * async processPayment() { ... }
 */
export const Audit = (options: AuditOptions) => SetMetadata(AUDIT_KEY, options);