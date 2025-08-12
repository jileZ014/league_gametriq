import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

interface AuthenticatedUser {
  id: string;
  organizationId: string;
  roles?: string[];
  isSuperAdmin?: boolean;
}

interface TenantRequest extends Request {
  user?: AuthenticatedUser;
  tenantId?: string;
}

@Injectable()
export class TenantGuardMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantGuardMiddleware.name);

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      // Extract tenant ID from various sources
      const tenantId = this.extractTenantId(req);
      
      if (!tenantId) {
        this.logger.warn('No tenant ID found in request');
        throw new ForbiddenException('Tenant context required');
      }

      // Validate tenant access
      await this.validateTenantAccess(req, tenantId);

      // Attach tenant ID to request for downstream use
      req.tenantId = tenantId;

      // Set tenant context for database queries
      await this.setDatabaseTenantContext(tenantId);

      next();
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Tenant guard error', error);
      throw new ForbiddenException('Access denied');
    }
  }

  private extractTenantId(req: TenantRequest): string | null {
    // Priority order:
    // 1. Route parameter (e.g., /organizations/:organizationId/...)
    // 2. Query parameter
    // 3. Request body
    // 4. User's organization from auth context
    
    const routeTenantId = req.params.organizationId || req.params.tenantId;
    if (routeTenantId) {
      return routeTenantId;
    }

    const queryTenantId = req.query.organizationId || req.query.tenantId;
    if (queryTenantId && typeof queryTenantId === 'string') {
      return queryTenantId;
    }

    const bodyTenantId = req.body?.organizationId || req.body?.tenantId;
    if (bodyTenantId) {
      return bodyTenantId;
    }

    // Fall back to user's organization
    if (req.user?.organizationId) {
      return req.user.organizationId;
    }

    return null;
  }

  private async validateTenantAccess(req: TenantRequest, tenantId: string): Promise<void> {
    const user = req.user;
    
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Super admin bypass
    if (user.isSuperAdmin) {
      this.logger.debug(`Super admin ${user.id} accessing tenant ${tenantId}`);
      return;
    }

    // Check if user belongs to the requested tenant
    if (user.organizationId !== tenantId) {
      this.logger.warn(
        `Cross-tenant access attempt: User ${user.id} (org: ${user.organizationId}) tried to access tenant ${tenantId}`,
      );
      throw new ForbiddenException('Cross-tenant access denied');
    }

    // Additional resource-level checks can be added here
    await this.validateResourceAccess(req, tenantId);
  }

  private async validateResourceAccess(req: TenantRequest, tenantId: string): Promise<void> {
    // Skip validation for certain routes
    const exemptPaths = ['/health', '/metrics', '/api/docs'];
    if (exemptPaths.some(path => req.path.startsWith(path))) {
      return;
    }

    // For specific resource endpoints, validate the resource belongs to the tenant
    const resourceValidators: Record<string, (req: TenantRequest, tenantId: string) => Promise<boolean>> = {
      '/api/payments': async (req, tenantId) => this.validatePaymentAccess(req, tenantId),
      '/api/branding': async (req, tenantId) => this.validateBrandingAccess(req, tenantId),
      '/api/audit': async (req, tenantId) => this.validateAuditAccess(req, tenantId),
    };

    for (const [pathPrefix, validator] of Object.entries(resourceValidators)) {
      if (req.path.startsWith(pathPrefix)) {
        const isValid = await validator(req, tenantId);
        if (!isValid) {
          throw new ForbiddenException('Resource access denied');
        }
        break;
      }
    }
  }

  private async validatePaymentAccess(req: TenantRequest, tenantId: string): Promise<boolean> {
    if (!req.params.paymentId) {
      return true; // List operations are filtered by tenant context
    }

    const result = await this.dataSource.query(
      'SELECT organization_id FROM payments WHERE id = $1',
      [req.params.paymentId],
    );

    return result.length > 0 && result[0].organization_id === tenantId;
  }

  private async validateBrandingAccess(req: TenantRequest, tenantId: string): Promise<boolean> {
    if (!req.params.brandingId) {
      return true;
    }

    const result = await this.dataSource.query(
      'SELECT organization_id FROM branding WHERE id = $1',
      [req.params.brandingId],
    );

    return result.length > 0 && result[0].organization_id === tenantId;
  }

  private async validateAuditAccess(req: TenantRequest, tenantId: string): Promise<boolean> {
    if (!req.params.auditId) {
      return true;
    }

    const result = await this.dataSource.query(
      'SELECT organization_id FROM audit_logs WHERE id = $1',
      [req.params.auditId],
    );

    return result.length > 0 && result[0].organization_id === tenantId;
  }

  private async setDatabaseTenantContext(tenantId: string): Promise<void> {
    // Set session-level tenant context for RLS (Row Level Security)
    // This ensures all queries in this request context are filtered by tenant
    try {
      await this.dataSource.query('SET LOCAL app.current_tenant_id = $1', [tenantId]);
    } catch (error) {
      this.logger.error('Failed to set database tenant context', error);
      // Continue without RLS if not supported
    }
  }
}

/**
 * Tenant-aware repository helper
 * Automatically adds tenant filtering to queries
 */
export class TenantAwareRepository<T> {
  constructor(
    private repository: any,
    private tenantIdField: string = 'organizationId',
  ) {}

  /**
   * Find entities with automatic tenant filtering
   */
  async find(options: any = {}, tenantId: string): Promise<T[]> {
    const whereClause = {
      ...options.where,
      [this.tenantIdField]: tenantId,
    };

    return this.repository.find({
      ...options,
      where: whereClause,
    });
  }

  /**
   * Find one entity with automatic tenant filtering
   */
  async findOne(options: any = {}, tenantId: string): Promise<T | null> {
    const whereClause = {
      ...options.where,
      [this.tenantIdField]: tenantId,
    };

    return this.repository.findOne({
      ...options,
      where: whereClause,
    });
  }

  /**
   * Create entity with automatic tenant assignment
   */
  async create(data: Partial<T>, tenantId: string): Promise<T> {
    const entityData = {
      ...data,
      [this.tenantIdField]: tenantId,
    };

    const entity = this.repository.create(entityData);
    return this.repository.save(entity);
  }

  /**
   * Update entity with tenant validation
   */
  async update(id: string, data: Partial<T>, tenantId: string): Promise<T> {
    // First verify the entity belongs to the tenant
    const existing = await this.findOne({ where: { id } }, tenantId);
    if (!existing) {
      throw new ForbiddenException('Resource not found or access denied');
    }

    await this.repository.update(
      { id, [this.tenantIdField]: tenantId },
      data,
    );

    return this.findOne({ where: { id } }, tenantId);
  }

  /**
   * Delete entity with tenant validation
   */
  async delete(id: string, tenantId: string): Promise<void> {
    const result = await this.repository.delete({
      id,
      [this.tenantIdField]: tenantId,
    });

    if (result.affected === 0) {
      throw new ForbiddenException('Resource not found or access denied');
    }
  }

  /**
   * Count entities with tenant filtering
   */
  async count(options: any = {}, tenantId: string): Promise<number> {
    const whereClause = {
      ...options.where,
      [this.tenantIdField]: tenantId,
    };

    return this.repository.count({
      ...options,
      where: whereClause,
    });
  }

  /**
   * Execute raw query with tenant filtering
   */
  async query(query: string, parameters: any[], tenantId: string): Promise<any> {
    // Add tenant filter to the query
    const tenantFilteredQuery = `
      WITH tenant_filter AS (
        SELECT * FROM (${query}) base_query
        WHERE ${this.tenantIdField} = $${parameters.length + 1}
      )
      SELECT * FROM tenant_filter
    `;

    return this.repository.query(tenantFilteredQuery, [...parameters, tenantId]);
  }
}

/**
 * Decorator to extract tenant ID from request
 */
export function TenantId() {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    const existingMetadata = Reflect.getMetadata('custom:tenant-id', target, propertyKey) || [];
    existingMetadata.push(parameterIndex);
    Reflect.defineMetadata('custom:tenant-id', existingMetadata, target, propertyKey);
  };
}