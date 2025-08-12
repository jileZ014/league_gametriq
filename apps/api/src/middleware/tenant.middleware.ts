import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface TenantRequest extends Request {
  organizationId?: string;
  tenantId?: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: TenantRequest, res: Response, next: NextFunction) {
    // Extract organization ID from various sources
    const organizationId = this.extractOrganizationId(req);

    if (!organizationId && !this.isPublicRoute(req.path)) {
      throw new BadRequestException('Organization ID is required');
    }

    // Attach organization ID to request
    req.organizationId = organizationId;
    req.tenantId = organizationId; // Alias for compatibility

    // Set organization ID in response headers for client reference
    if (organizationId) {
      res.setHeader('X-Organization-Id', organizationId);
    }

    next();
  }

  private extractOrganizationId(req: TenantRequest): string | null {
    // Priority order for organization ID extraction
    
    // 1. Check header
    const headerOrgId = req.headers['x-organization-id'] as string;
    if (headerOrgId) {
      return headerOrgId;
    }

    // 2. Check JWT token claims (if authenticated)
    if ((req as any).user?.organizationId) {
      return (req as any).user.organizationId;
    }

    // 3. Check query parameter
    if (req.query.organizationId) {
      return req.query.organizationId as string;
    }

    // 4. Check subdomain
    const subdomain = this.extractSubdomain(req);
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      return subdomain;
    }

    // 5. Check path parameter (e.g., /api/v1/organizations/:orgId/...)
    const pathMatch = req.path.match(/\/organizations\/([^\/]+)/);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1];
    }

    return null;
  }

  private extractSubdomain(req: Request): string | null {
    const host = req.get('host');
    if (!host) return null;

    const parts = host.split('.');
    if (parts.length >= 3) {
      return parts[0];
    }

    return null;
  }

  private isPublicRoute(path: string): boolean {
    const publicRoutes = [
      '/health',
      '/api/docs',
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/refresh',
      '/api/v1/public',
    ];

    return publicRoutes.some(route => path.startsWith(route));
  }
}