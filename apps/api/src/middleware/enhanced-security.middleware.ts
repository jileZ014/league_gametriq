import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import * as crypto from 'crypto';
import * as helmet from 'helmet';

interface SecurityConfig {
  enableCSP: boolean;
  enableRateLimiting: boolean;
  enableCOPPAProtection: boolean;
  enableAuditLogging: boolean;
  maxRequestSize: number;
  trustedProxies: string[];
}

interface SecurityViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
  timestamp: Date;
  ip: string;
  userAgent?: string;
  userId?: string;
}

@Injectable()
export class EnhancedSecurityMiddleware implements NestMiddleware {
  private readonly config: SecurityConfig;
  private readonly bannedUserAgents: RegExp[];
  private readonly suspiciousPatterns: RegExp[];
  
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.config = {
      enableCSP: this.configService.get('SECURITY_ENABLE_CSP', true),
      enableRateLimiting: this.configService.get('SECURITY_ENABLE_RATE_LIMITING', true),
      enableCOPPAProtection: this.configService.get('SECURITY_ENABLE_COPPA', true),
      enableAuditLogging: this.configService.get('SECURITY_ENABLE_AUDIT_LOGGING', true),
      maxRequestSize: this.configService.get('SECURITY_MAX_REQUEST_SIZE', 8192),
      trustedProxies: this.configService.get('SECURITY_TRUSTED_PROXIES', '').split(',').filter(Boolean),
    };

    this.bannedUserAgents = [
      /bot|crawler|spider|scraper/i,
      /curl|wget|python|perl|ruby/i,
      /postman|insomnia|httpie/i,  // Block API testing tools in production
    ];

    this.suspiciousPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i,  // Event handlers
      /eval\s*\(/i,
      /expression\s*\(/i,
    ];
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    
    try {
      // Apply basic security headers
      this.applySecurityHeaders(req, res);
      
      // Check for banned user agents
      if (this.isBannedUserAgent(req)) {
        await this.logSecurityViolation(req, {
          type: 'banned_user_agent',
          severity: 'medium',
          details: { userAgent: req.headers['user-agent'] },
          timestamp: new Date(),
          ip: this.extractIp(req),
          userAgent: req.headers['user-agent'] as string,
        });
        
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }

      // Validate request size
      if (this.exceedsMaxRequestSize(req)) {
        await this.logSecurityViolation(req, {
          type: 'oversized_request',
          severity: 'medium',
          details: { contentLength: req.headers['content-length'] },
          timestamp: new Date(),
          ip: this.extractIp(req),
        });
        
        throw new HttpException('Request entity too large', HttpStatus.PAYLOAD_TOO_LARGE);
      }

      // Check for suspicious patterns in URL and headers
      if (this.containsSuspiciousPatterns(req)) {
        await this.logSecurityViolation(req, {
          type: 'suspicious_pattern',
          severity: 'high',
          details: { 
            url: req.url,
            headers: this.sanitizeHeaders(req.headers),
          },
          timestamp: new Date(),
          ip: this.extractIp(req),
        });
        
        throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
      }

      // COPPA protection for youth data endpoints
      if (this.config.enableCOPPAProtection && this.isCOPPAProtectedEndpoint(req)) {
        await this.applyCOPPAProtection(req, res);
      }

      // Advanced rate limiting with adaptive thresholds
      if (this.config.enableRateLimiting) {
        await this.applyAdvancedRateLimit(req, res);
      }

      // IP reputation check
      await this.checkIPReputation(req);

      // Geographic anomaly detection
      await this.detectGeographicAnomalies(req);

      // Audit logging for sensitive operations
      if (this.config.enableAuditLogging && this.isSensitiveOperation(req)) {
        await this.auditSensitiveOperation(req);
      }

      const processingTime = Date.now() - startTime;
      res.setHeader('X-Security-Processing-Time', `${processingTime}ms`);
      
      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Log unexpected errors but don't block requests
      console.error('Security middleware error:', error);
      next();
    }
  }

  private applySecurityHeaders(req: Request, res: Response): void {
    // Enhanced Content Security Policy for basketball platform
    const cspPolicy = this.buildCSPPolicy(req);
    res.setHeader('Content-Security-Policy', cspPolicy);
    
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    
    // COPPA compliance headers for youth data
    if (this.isCOPPAProtectedEndpoint(req)) {
      res.setHeader('X-Youth-Data-Protection', 'COPPA-Compliant');
      res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    // Custom headers for basketball platform
    res.setHeader('X-Basketball-Platform', 'Legacy-Youth-Sports');
    res.setHeader('X-Security-Version', '2.0');
  }

  private buildCSPPolicy(req: Request): string {
    const basePolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' wss: https://api.stripe.com https://checkout.stripe.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ];

    // Relax policy for development
    if (this.configService.get('NODE_ENV') !== 'production') {
      basePolicy.push("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
      basePolicy.push("connect-src 'self' ws: wss: http: https:");
    }

    return basePolicy.join('; ');
  }

  private isBannedUserAgent(req: Request): boolean {
    const userAgent = req.headers['user-agent'];
    if (!userAgent) return true; // Block requests without user agent
    
    // Skip checks in development
    if (this.configService.get('NODE_ENV') !== 'production') {
      return false;
    }
    
    return this.bannedUserAgents.some(pattern => pattern.test(userAgent));
  }

  private exceedsMaxRequestSize(req: Request): boolean {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    return contentLength > this.config.maxRequestSize;
  }

  private containsSuspiciousPatterns(req: Request): boolean {
    const url = decodeURIComponent(req.url);
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers.referer || '';
    
    const testStrings = [url, userAgent, referer];
    
    return testStrings.some(str => 
      this.suspiciousPatterns.some(pattern => pattern.test(str))
    );
  }

  private isCOPPAProtectedEndpoint(req: Request): boolean {
    const coppaProtectedPaths = [
      '/api/players',
      '/api/users/players',
      '/register/player',
      '/api/registration/player',
      '/api/auth/register/youth',
    ];

    return coppaProtectedPaths.some(path => req.path.includes(path));
  }

  private async applyCOPPAProtection(req: Request, res: Response): Promise<void> {
    // Enhanced logging for youth data access
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];
    const userId = this.extractUserId(req);
    
    await this.logSecurityViolation(req, {
      type: 'coppa_protected_access',
      severity: 'low',
      details: {
        endpoint: req.path,
        method: req.method,
        hasParentalConsent: req.body?.parentalConsent,
        dobProvided: !!req.body?.dateOfBirth,
      },
      timestamp: new Date(),
      ip,
      userAgent,
      userId,
    });

    // Stricter rate limiting for COPPA endpoints
    const rateLimitKey = `coppa_limit:${ip}:${Math.floor(Date.now() / 60000)}`;
    const currentCount = await this.redis.incr(rateLimitKey);
    await this.redis.expire(rateLimitKey, 60);
    
    if (currentCount > 10) { // 10 requests per minute for youth data
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Rate limit exceeded for youth data endpoints',
        error: 'Too Many Requests',
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    // Validate parental consent for player registration
    if (req.method === 'POST' && req.path.includes('register')) {
      if (!req.body?.parentalConsent) {
        throw new HttpException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Parental consent required for youth registration',
          error: 'COPPA Violation',
        }, HttpStatus.BAD_REQUEST);
      }
    }
  }

  private async applyAdvancedRateLimit(req: Request, res: Response): Promise<void> {
    const ip = this.extractIp(req);
    const userId = this.extractUserId(req);
    const endpoint = this.categorizeEndpoint(req.path);
    
    // Different limits based on endpoint category and user type
    const limits = this.getRateLimits(endpoint, userId !== null);
    
    const key = userId ? `user:${userId}` : `ip:${ip}`;
    const rateLimitKey = `rate_limit:${endpoint}:${key}:${Math.floor(Date.now() / limits.windowMs)}`;
    
    const currentCount = await this.redis.incr(rateLimitKey);
    await this.redis.expire(rateLimitKey, Math.ceil(limits.windowMs / 1000));
    
    res.setHeader('X-RateLimit-Limit', limits.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limits.max - currentCount));
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + limits.windowMs).toISOString());
    
    if (currentCount > limits.max) {
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Rate limit exceeded',
        error: 'Too Many Requests',
        retryAfter: Math.ceil(limits.windowMs / 1000),
      }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private categorizeEndpoint(path: string): string {
    if (path.includes('/api/payments/') || path.includes('/api/stripe/')) return 'payment';
    if (path.includes('/api/auth/')) return 'auth';
    if (path.includes('/api/admin/')) return 'admin';
    if (path.includes('/api/tournaments/')) return 'tournament';
    if (path.includes('/api/games/live')) return 'live_scoring';
    if (path.includes('/api/players/') || path.includes('/register/player')) return 'youth_data';
    if (path.includes('/api/public/')) return 'public';
    return 'general';
  }

  private getRateLimits(endpoint: string, isAuthenticated: boolean): { max: number; windowMs: number } {
    const limits = {
      payment: { max: isAuthenticated ? 30 : 5, windowMs: 60000 },
      auth: { max: 10, windowMs: 60000 },
      admin: { max: 200, windowMs: 60000 },
      tournament: { max: isAuthenticated ? 100 : 30, windowMs: 60000 },
      live_scoring: { max: isAuthenticated ? 500 : 100, windowMs: 60000 }, // Higher for live updates
      youth_data: { max: 10, windowMs: 60000 }, // Strict for COPPA
      public: { max: isAuthenticated ? 100 : 50, windowMs: 60000 },
      general: { max: isAuthenticated ? 200 : 100, windowMs: 60000 },
    };
    
    return limits[endpoint] || limits.general;
  }

  private async checkIPReputation(req: Request): Promise<void> {
    const ip = this.extractIp(req);
    
    // Check if IP is in our blocked list
    const isBlocked = await this.redis.sismember('blocked_ips', ip);
    if (isBlocked) {
      throw new HttpException('IP address blocked', HttpStatus.FORBIDDEN);
    }
    
    // Check failure rate for this IP
    const failureKey = `ip_failures:${ip}`;
    const failures = await this.redis.get(failureKey);
    
    if (failures && parseInt(failures) > 50) {
      // Temporarily block IPs with high failure rates
      await this.redis.sadd('temp_blocked_ips', ip);
      await this.redis.expire(`temp_blocked_ips:${ip}`, 3600); // 1 hour block
      
      throw new HttpException('IP temporarily blocked due to suspicious activity', HttpStatus.FORBIDDEN);
    }
  }

  private async detectGeographicAnomalies(req: Request): Promise<void> {
    const userId = this.extractUserId(req);
    if (!userId) return;
    
    const ip = this.extractIp(req);
    const userLocationKey = `user_location:${userId}`;
    const lastLocation = await this.redis.get(userLocationKey);
    
    // In production, you would use a GeoIP service here
    // For now, we'll just store and compare IP addresses
    if (lastLocation && lastLocation !== ip) {
      // Different IP detected - could be legitimate (mobile, different network)
      // Log for analysis but don't block
      await this.logSecurityViolation(req, {
        type: 'geographic_anomaly',
        severity: 'low',
        details: { 
          currentIp: ip,
          previousIp: lastLocation,
          userId,
        },
        timestamp: new Date(),
        ip,
        userId,
      });
    }
    
    // Update user's current location
    await this.redis.setex(userLocationKey, 86400, ip); // 24 hours
  }

  private isSensitiveOperation(req: Request): boolean {
    const sensitivePatterns = [
      '/api/payments/',
      '/api/admin/',
      '/api/users/',
      '/api/auth/password',
      '/api/tournaments/',
    ];
    
    const sensitiveActions = ['POST', 'PUT', 'PATCH', 'DELETE'];
    
    return sensitiveActions.includes(req.method) && 
           sensitivePatterns.some(pattern => req.path.includes(pattern));
  }

  private async auditSensitiveOperation(req: Request): Promise<void> {
    const auditLog = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip: this.extractIp(req),
      userAgent: req.headers['user-agent'],
      userId: this.extractUserId(req),
      organizationId: this.extractOrganizationId(req),
      headers: this.sanitizeHeaders(req.headers),
      // Don't log request body for security - just indicate if present
      hasBody: !!req.body && Object.keys(req.body).length > 0,
    };
    
    await this.redis.lpush('audit_log', JSON.stringify(auditLog));
    await this.redis.ltrim('audit_log', 0, 10000); // Keep last 10,000 entries
  }

  private async logSecurityViolation(req: Request, violation: SecurityViolation): Promise<void> {
    const logEntry = {
      ...violation,
      timestamp: violation.timestamp.toISOString(),
      method: req.method,
      path: req.path,
      headers: this.sanitizeHeaders(req.headers),
    };
    
    // Store in Redis for immediate analysis
    await this.redis.lpush('security_violations', JSON.stringify(logEntry));
    await this.redis.ltrim('security_violations', 0, 1000); // Keep last 1,000 violations
    
    // For high/critical violations, also increment failure counter
    if (violation.severity === 'high' || violation.severity === 'critical') {
      const failureKey = `ip_failures:${violation.ip}`;
      await this.redis.incr(failureKey);
      await this.redis.expire(failureKey, 3600); // Reset hourly
    }
    
    // Log to console for immediate visibility
    console.warn(`Security violation: ${violation.type}`, {
      severity: violation.severity,
      ip: violation.ip,
      path: req.path,
      details: violation.details,
    });
  }

  private extractIp(req: Request): string {
    // Extract real IP considering trusted proxies
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded && this.config.trustedProxies.length > 0) {
      const ips = (forwarded as string).split(',').map(ip => ip.trim());
      return ips[0];
    }
    
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }
    
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  private extractUserId(req: Request): string | null {
    return (req as any).user?.id || (req as any).user?.userId || null;
  }

  private extractOrganizationId(req: Request): string | null {
    return (req as any).user?.organizationId || 
           req.headers['x-organization-id'] as string || 
           null;
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    // Remove sensitive headers from logs
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
}

// Circuit Breaker Service for resilient API calls
@Injectable()
export class CircuitBreakerService {
  private breakers = new Map<string, any>();

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  async execute<T>(
    key: string,
    operation: () => Promise<T>,
    options: {
      threshold?: number;
      timeout?: number;
      resetTimeout?: number;
      fallback?: () => Promise<T>;
    } = {}
  ): Promise<T> {
    const config = {
      threshold: options.threshold || 5,
      timeout: options.timeout || 5000,
      resetTimeout: options.resetTimeout || 30000,
      ...options,
    };

    let breaker = this.breakers.get(key);
    
    if (!breaker) {
      const CircuitBreaker = require('opossum');
      breaker = new CircuitBreaker(operation, {
        threshold: config.threshold,
        timeout: config.timeout,
        resetTimeout: config.resetTimeout,
        errorThresholdPercentage: 50,
        volumeThreshold: 10,
      });
      
      breaker.on('open', () => {
        console.log(`Circuit breaker ${key} opened`);
        this.redis.setex(`circuit_breaker:${key}:state`, 60, 'open');
      });
      
      breaker.on('halfOpen', () => {
        console.log(`Circuit breaker ${key} half-open`);
        this.redis.setex(`circuit_breaker:${key}:state`, 60, 'half-open');
      });
      
      breaker.on('close', () => {
        console.log(`Circuit breaker ${key} closed`);
        this.redis.setex(`circuit_breaker:${key}:state`, 60, 'closed');
      });
      
      breaker.fallback(options.fallback || (() => {
        throw new Error(`Circuit breaker ${key} fallback`);
      }));
      
      this.breakers.set(key, breaker);
    }
    
    return breaker.fire();
  }

  async getState(key: string): Promise<string> {
    return await this.redis.get(`circuit_breaker:${key}:state`) || 'unknown';
  }

  getStats(key: string): any {
    const breaker = this.breakers.get(key);
    return breaker ? breaker.stats : null;
  }
}