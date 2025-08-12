import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    // Attach request ID to request object
    (req as any).requestId = requestId;

    // Log request
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const organizationId = headers['x-organization-id'] || 'none';

    // Scrub sensitive data from logs
    const sanitizedBody = this.sanitizeData(req.body);
    const sanitizedQuery = this.sanitizeData(req.query);

    this.logger.log(
      `[${requestId}] ${method} ${originalUrl} - ${ip} - ${userAgent} - Org: ${organizationId}`,
    );

    if (Object.keys(sanitizedQuery).length > 0) {
      this.logger.debug(`[${requestId}] Query: ${JSON.stringify(sanitizedQuery)}`);
    }

    if (Object.keys(sanitizedBody).length > 0 && method !== 'GET') {
      this.logger.debug(`[${requestId}] Body: ${JSON.stringify(sanitizedBody)}`);
    }

    // Log response
    const originalSend = res.send;
    res.send = function(data) {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Log response details
      const logLevel = statusCode >= 400 ? 'error' : 'log';
      const logger = new Logger('HTTP');
      
      logger[logLevel](
        `[${requestId}] ${method} ${originalUrl} - ${statusCode} - ${responseTime}ms`,
      );

      // Performance warning for slow requests
      if (responseTime > 1000) {
        logger.warn(
          `[${requestId}] Slow request detected: ${method} ${originalUrl} took ${responseTime}ms`,
        );
      }

      return originalSend.call(this, data);
    };

    next();
  }

  private sanitizeData(data: any): any {
    if (!data) return {};

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'creditCard',
      'cvv',
      'ssn',
      'dob',
      'dateOfBirth',
      'refreshToken',
      'accessToken',
      'stripeToken',
      'paymentMethod',
    ];

    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
      // Check for nested fields
      for (const key in sanitized) {
        if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          sanitized[key] = this.sanitizeData(sanitized[key]);
        }
      }
    }

    return sanitized;
  }
}