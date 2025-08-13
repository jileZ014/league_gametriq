/**
 * Performance Optimization Middleware for Basketball League API
 * Target: <100ms P95 API response time
 * Handles 1000+ concurrent users during tournaments
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as compression from 'compression';
import { performance } from 'perf_hooks';

@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMiddleware.name);
  private compressionMiddleware: any;

  constructor() {
    // Configure compression for optimal basketball league API responses
    this.compressionMiddleware = compression({
      // Compression level optimized for JSON API responses
      level: 6,
      
      // Minimum response size to compress (1KB)
      threshold: 1024,
      
      // Filter function to determine what to compress
      filter: this.shouldCompress.bind(this),
      
      // Memory level (1-9, higher = more memory, better compression)
      memLevel: 8,
      
      // Window bits for zlib (9-15, higher = better compression, more memory)
      windowBits: 15,
      
      // Strategy for zlib compression
      strategy: compression.constants.Z_DEFAULT_STRATEGY,
      
      // Chunk size for streaming compression
      chunkSize: 16 * 1024, // 16KB chunks
    });
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = performance.now();
    
    // Add performance headers for monitoring
    this.addPerformanceHeaders(req, res);
    
    // Apply compression
    this.compressionMiddleware(req, res, () => {
      // Add response time measurement
      this.measureResponseTime(req, res, startTime);
      
      // Continue to next middleware
      next();
    });
  }

  /**
   * Determine whether to compress the response
   */
  private shouldCompress(req: Request, res: Response): boolean {
    const contentType = res.getHeader('Content-Type') as string;
    
    // Don't compress if already compressed or if client doesn't support it
    if (req.headers['x-no-compression'] || 
        res.getHeader('Content-Encoding') ||
        !compression.filter(req, res)) {
      return false;
    }

    // Always compress JSON API responses (our primary content type)
    if (contentType && contentType.includes('application/json')) {
      return true;
    }

    // Compress text-based responses
    if (contentType && (
      contentType.includes('text/') ||
      contentType.includes('application/javascript') ||
      contentType.includes('application/xml') ||
      contentType.includes('application/rss+xml')
    )) {
      return true;
    }

    // Don't compress images, videos, or already compressed files
    if (contentType && (
      contentType.includes('image/') ||
      contentType.includes('video/') ||
      contentType.includes('audio/') ||
      contentType.includes('application/zip') ||
      contentType.includes('application/gzip')
    )) {
      return false;
    }

    // Default to compression filter
    return compression.filter(req, res);
  }

  /**
   * Add performance-related headers for monitoring and optimization
   */
  private addPerformanceHeaders(req: Request, res: Response): void {
    // Enable browser caching for static API responses
    if (this.isStaticApiEndpoint(req.path)) {
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes for static data
    } else if (this.isLiveDataEndpoint(req.path)) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    // CORS headers for frontend optimization
    res.set('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID, X-Request-ID');
    res.set('Access-Control-Expose-Headers', 'X-Response-Time, X-Cache-Status, X-Rate-Limit-Remaining');

    // Optimize browser parsing
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    
    // Request ID for tracing
    const requestId = req.headers['x-request-id'] || this.generateRequestId();
    res.set('X-Request-ID', requestId);
    
    // Add timestamp for client-side performance measurement
    res.set('X-Server-Timestamp', Date.now().toString());
  }

  /**
   * Measure and log response times for performance monitoring
   */
  private measureResponseTime(req: Request, res: Response, startTime: number): void {
    const originalEnd = res.end;
    
    res.end = function(chunk?: any, encoding?: any): void {
      const duration = performance.now() - startTime;
      
      // Add response time header
      res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
      
      // Log slow responses for optimization
      const logger = new Logger('PerformanceMiddleware');
      if (duration > 100) { // Log responses slower than 100ms
        logger.warn(`Slow API response: ${req.method} ${req.path} - ${duration.toFixed(2)}ms`, {
          method: req.method,
          path: req.path,
          duration: duration.toFixed(2),
          userAgent: req.headers['user-agent'],
          contentLength: res.get('Content-Length') || '0'
        });
      }

      // Call the original end method
      originalEnd.call(this, chunk, encoding);
    };
  }

  /**
   * Check if endpoint serves static/cacheable data
   */
  private isStaticApiEndpoint(path: string): boolean {
    const staticEndpoints = [
      '/api/leagues',
      '/api/teams',
      '/api/players',
      '/api/seasons',
      '/api/venues',
      '/api/standings',
      '/api/schedules'
    ];

    return staticEndpoints.some(endpoint => path.startsWith(endpoint)) &&
           !path.includes('/live') &&
           !path.includes('/current');
  }

  /**
   * Check if endpoint serves real-time data that shouldn't be cached
   */
  private isLiveDataEndpoint(path: string): boolean {
    const liveEndpoints = [
      '/api/games/live',
      '/api/scores/live',
      '/api/tournaments/live',
      '/api/websocket'
    ];

    return liveEndpoints.some(endpoint => path.includes(endpoint));
  }

  /**
   * Generate unique request ID for tracing
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Field Selection Interceptor for reducing API payload sizes
 */
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class FieldSelectionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const fieldsParam = request.query.fields;
    
    return next.handle().pipe(
      map(data => {
        if (!fieldsParam || !data) {
          return data;
        }

        const fields = fieldsParam.split(',').map((field: string) => field.trim());
        
        if (Array.isArray(data)) {
          return data.map(item => this.selectFields(item, fields));
        } else if (typeof data === 'object') {
          return this.selectFields(data, fields);
        }

        return data;
      })
    );
  }

  private selectFields(obj: any, fields: string[]): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result: any = {};
    
    fields.forEach(field => {
      if (field.includes('.')) {
        // Handle nested field selection (e.g., 'player.name')
        const [parent, child] = field.split('.');
        if (obj[parent] && typeof obj[parent] === 'object') {
          if (!result[parent]) result[parent] = {};
          result[parent][child] = obj[parent][child];
        }
      } else if (obj.hasOwnProperty(field)) {
        result[field] = obj[field];
      }
    });

    // Always include ID fields for data consistency
    if (obj.id && !result.id) result.id = obj.id;
    if (obj._id && !result._id) result._id = obj._id;

    return result;
  }
}

/**
 * Response Pagination Interceptor for large datasets
 */
@Injectable()
export class PaginationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    return next.handle().pipe(
      map(data => {
        // Only paginate arrays of data
        if (!Array.isArray(data)) {
          return data;
        }

        const page = parseInt(request.query.page) || 1;
        const limit = Math.min(parseInt(request.query.limit) || 25, 100); // Max 100 items per page
        const offset = (page - 1) * limit;
        
        const paginatedData = data.slice(offset, offset + limit);
        const totalCount = data.length;
        const totalPages = Math.ceil(totalCount / limit);

        // Add pagination headers
        response.set('X-Total-Count', totalCount.toString());
        response.set('X-Page', page.toString());
        response.set('X-Per-Page', limit.toString());
        response.set('X-Total-Pages', totalPages.toString());
        
        // Add pagination links
        const baseUrl = `${request.protocol}://${request.get('host')}${request.path}`;
        const links: string[] = [];
        
        if (page > 1) {
          links.push(`<${baseUrl}?page=1&limit=${limit}>; rel="first"`);
          links.push(`<${baseUrl}?page=${page - 1}&limit=${limit}>; rel="prev"`);
        }
        
        if (page < totalPages) {
          links.push(`<${baseUrl}?page=${page + 1}&limit=${limit}>; rel="next"`);
          links.push(`<${baseUrl}?page=${totalPages}&limit=${limit}>; rel="last"`);
        }
        
        if (links.length > 0) {
          response.set('Link', links.join(', '));
        }

        return {
          data: paginatedData,
          pagination: {
            page,
            limit,
            total: totalCount,
            pages: totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        };
      })
    );
  }
}