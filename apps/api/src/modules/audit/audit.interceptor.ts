import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuditService } from './audit.service';
import { AuditEventStatus } from './audit.entity';
import { AUDIT_KEY, AuditOptions } from './audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.get<AuditOptions>(
      AUDIT_KEY,
      context.getHandler(),
    );

    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    // Extract context
    const auditContext = {
      organizationId: this.extractOrganizationId(request),
      userId: this.extractUserId(request),
      request,
      entityType: auditOptions.entityType,
    };

    // Prepare metadata
    const metadata: any = {};
    
    if (auditOptions.includeRequestBody && request.body) {
      metadata.requestBody = this.sanitizeData(
        request.body,
        auditOptions.sensitiveFields || [],
      );
    }

    return next.handle().pipe(
      tap(async (response) => {
        const duration = Date.now() - startTime;

        // Extract entity ID if configured
        if (auditOptions.extractEntityId && response) {
          auditContext.entityId = auditOptions.extractEntityId(response);
        }

        // Include response data if configured
        if (auditOptions.includeResponse && response) {
          metadata.response = this.sanitizeData(
            response,
            auditOptions.sensitiveFields || [],
          );
        }

        // Log successful action
        await this.auditService.log({
          action: auditOptions.action,
          status: AuditEventStatus.SUCCESS,
          context: auditContext,
          metadata,
          durationMs: duration,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        // Log failed action
        this.auditService.logFailure(
          auditOptions.action,
          auditContext,
          error,
          { ...metadata, durationMs: duration },
        ).catch(auditError => {
          console.error('Failed to log audit error:', auditError);
        });

        return throwError(() => error);
      }),
    );
  }

  private extractOrganizationId(request: Request): string | null {
    return (
      (request as any).user?.organizationId ||
      request.headers['x-organization-id'] as string ||
      request.query.organizationId as string ||
      request.body?.organizationId ||
      null
    );
  }

  private extractUserId(request: Request): string | null {
    return (request as any).user?.id || (request as any).user?.userId || null;
  }

  private sanitizeData(data: any, sensitiveFields: string[]): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    
    // Remove sensitive fields
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // Remove common sensitive fields
    const commonSensitiveFields = [
      'password',
      'creditCard',
      'cvv',
      'ssn',
      'socialSecurityNumber',
      'accountNumber',
      'routingNumber',
    ];

    commonSensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}