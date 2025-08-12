import { Injectable, NestMiddleware, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  bypassCheck?: (req: Request) => boolean | Promise<boolean>;
}

export interface RateLimitRule {
  path: string | RegExp;
  config: RateLimitConfig;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly rules: RateLimitRule[];
  private readonly defaultWindowMs = 60000; // 1 minute
  private readonly defaultMax = 100;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.rules = this.initializeRules();
  }

  private initializeRules(): RateLimitRule[] {
    return [
      {
        path: /^\/api\/portal\//,
        config: {
          windowMs: 60000, // 1 minute
          max: 100, // 100 requests per minute
          keyGenerator: this.generateKey.bind(this),
          bypassCheck: this.isAdminUser.bind(this),
        },
      },
      {
        path: /^\/api\/payments\//,
        config: {
          windowMs: 60000, // 1 minute
          max: 20, // 20 requests per minute
          keyGenerator: this.generateKey.bind(this),
          bypassCheck: this.isAdminUser.bind(this),
        },
      },
      {
        path: /^\/api\/admin\//,
        config: {
          windowMs: 60000, // 1 minute
          max: 200, // 200 requests per minute for admin
          keyGenerator: this.generateKey.bind(this),
        },
      },
      {
        path: /^\/api\/public\//,
        config: {
          windowMs: 60000, // 1 minute
          max: 30, // 30 requests per minute for public endpoints
          keyGenerator: this.generateIpKey.bind(this),
        },
      },
    ];
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    
    try {
      // Find matching rule
      const rule = this.findMatchingRule(req.path);
      if (!rule) {
        // No specific rule, apply default rate limit
        await this.applyRateLimit(req, res, {
          windowMs: this.defaultWindowMs,
          max: this.defaultMax,
          keyGenerator: this.generateKey.bind(this),
        });
      } else {
        // Check bypass condition
        if (rule.config.bypassCheck && await rule.config.bypassCheck(req)) {
          return next();
        }

        // Apply rate limit
        await this.applyRateLimit(req, res, rule.config);
      }

      // Check performance
      const duration = Date.now() - startTime;
      if (duration > 5) {
        console.warn(`Rate limit check took ${duration}ms for ${req.path}`);
      }

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Log error but don't block request if rate limiting fails
      console.error('Rate limit error:', error);
      next();
    }
  }

  private async applyRateLimit(
    req: Request,
    res: Response,
    config: RateLimitConfig,
  ): Promise<void> {
    const key = config.keyGenerator ? config.keyGenerator(req) : this.generateKey(req);
    const windowKey = `ratelimit:${key}:${Math.floor(Date.now() / config.windowMs)}`;
    
    // Sliding window implementation using Redis
    const multi = this.redis.multi();
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Remove old entries
    multi.zremrangebyscore(windowKey, '-inf', windowStart);
    
    // Count current window requests
    multi.zcard(windowKey);
    
    // Add current request
    multi.zadd(windowKey, now, `${now}-${Math.random()}`);
    
    // Set expiry
    multi.expire(windowKey, Math.ceil(config.windowMs / 1000) + 1);
    
    const results = await multi.exec();
    const count = results[1][1] as number;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - count));
    res.setHeader('X-RateLimit-Reset', new Date(now + config.windowMs).toISOString());

    if (count > config.max) {
      // Calculate retry after
      const oldestRequest = await this.redis.zrange(windowKey, 0, 0, 'WITHSCORES');
      let retryAfter = config.windowMs;
      
      if (oldestRequest.length >= 2) {
        const oldestTime = parseInt(oldestRequest[1]);
        retryAfter = Math.max(0, (oldestTime + config.windowMs) - now);
      }

      res.setHeader('Retry-After', Math.ceil(retryAfter / 1000));
      
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Too many requests, please try again later.',
        error: 'Too Many Requests',
        retryAfter: Math.ceil(retryAfter / 1000),
      }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private findMatchingRule(path: string): RateLimitRule | null {
    return this.rules.find(rule => {
      if (typeof rule.path === 'string') {
        return path.startsWith(rule.path);
      }
      return rule.path.test(path);
    });
  }

  private generateKey(req: Request): string {
    // Generate key based on tenant/organization and IP
    const organizationId = this.extractOrganizationId(req);
    const ip = this.extractIp(req);
    
    if (organizationId) {
      return `tenant:${organizationId}:${ip}`;
    }
    
    // For authenticated users without organization
    const userId = this.extractUserId(req);
    if (userId) {
      return `user:${userId}:${ip}`;
    }
    
    // Fall back to IP-based limiting
    return `ip:${ip}`;
  }

  private generateIpKey(req: Request): string {
    const ip = this.extractIp(req);
    return `ip:${ip}`;
  }

  private extractOrganizationId(req: Request): string | null {
    // Check various sources for organization ID
    return (
      (req as any).user?.organizationId ||
      req.headers['x-organization-id'] as string ||
      req.query.organizationId as string ||
      req.body?.organizationId ||
      null
    );
  }

  private extractUserId(req: Request): string | null {
    return (req as any).user?.id || (req as any).user?.userId || null;
  }

  private extractIp(req: Request): string {
    // Extract real IP considering proxies
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }
    
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }
    
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  private async isAdminUser(req: Request): Promise<boolean> {
    const user = (req as any).user;
    if (!user) return false;
    
    // Check if user has admin role
    return user.roles?.includes('admin') || user.isAdmin === true;
  }
}

/**
 * Factory function to create rate limit middleware with custom config
 */
export function createRateLimitMiddleware(config: RateLimitConfig): NestMiddleware {
  return {
    use: async (req: Request, res: Response, next: NextFunction) => {
      const redis = (req as any).app.get('REDIS_CLIENT');
      const middleware = new RateLimitMiddleware(redis, null);
      
      try {
        await middleware['applyRateLimit'](req, res, config);
        next();
      } catch (error) {
        if (error instanceof HttpException) {
          res.status(error.getStatus()).json(error.getResponse());
        } else {
          next();
        }
      }
    },
  };
}