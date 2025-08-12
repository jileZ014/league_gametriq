import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { hashIpAddress, extractIpFromRequest } from '../utils/ip_hash';

/**
 * PII Log Scrubbing Middleware
 * Redacts sensitive personal information from logs to ensure compliance and privacy
 */

// PII fields to redact
const PII_FIELDS = new Set([
  // Personal identifiers
  'email',
  'phone',
  'dob',
  'dateOfBirth',
  'guardian_email',
  'guardianEmail',
  'ssn',
  'socialSecurityNumber',
  
  // Network/Location
  'ip',
  'ipAddress',
  'ip_address',
  
  // Authentication
  'token',
  'auth',
  'authorization',
  'access_token',
  'accessToken',
  'refresh_token',
  'refreshToken',
  'api_key',
  'apiKey',
  'password',
  'passwordHash',
  'secret',
  
  // Payment information
  'payment_method',
  'paymentMethod',
  'payment_token',
  'paymentToken',
  'payment_id',
  'paymentId',
  'card_number',
  'cardNumber',
  'card_holder',
  'cardHolder',
  'card_cvc',
  'cardCvc',
  'cvv',
  'cvc',
  'card_exp',
  'cardExp',
  'account_number',
  'accountNumber',
  'routing_number',
  'routingNumber',
  'iban',
  'stripe_token',
  'stripeToken',
  'stripe_customer',
  'stripeCustomer',
]);

// Patterns for fields that start with certain prefixes
const PII_PREFIXES = [
  'payment_',
  'card_',
  'stripe_',
  'auth_',
  'token_',
];

// Fields that need special handling (hashing instead of full redaction)
const HASH_FIELDS = new Set(['ip', 'ipAddress', 'ip_address']);

interface ScrubbedData {
  [key: string]: any;
}

@Injectable()
export class LogScrubberMiddleware implements NestMiddleware {
  private readonly maxDepth = 10; // Prevent infinite recursion
  private readonly redactedValue = '[REDACTED]';
  private scrubberCache = new Map<string, boolean>();

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = process.hrtime.bigint();
    
    // Store original methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalWrite = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    // Scrub request data
    if (req.body) {
      req.body = this.scrubData(req.body);
    }
    
    if (req.query) {
      req.query = this.scrubData(req.query as any) as any;
    }
    
    if (req.headers) {
      req.headers = this.scrubHeaders(req.headers);
    }

    // Override response methods to scrub response data
    res.send = function(data: any) {
      const scrubbedData = typeof data === 'object' ? 
        JSON.stringify(this.scrubData(data)) : data;
      return originalSend.call(this, scrubbedData);
    }.bind(this);

    res.json = function(data: any) {
      const scrubbedData = this.scrubData(data);
      return originalJson.call(this, scrubbedData);
    }.bind(this);

    // Override console methods to scrub logged data
    const scrubber = this;
    console.log = function(...args: any[]) {
      const scrubbedArgs = args.map(arg => scrubber.scrubLogArg(arg));
      originalWrite.apply(console, scrubbedArgs);
    };

    console.error = function(...args: any[]) {
      const scrubbedArgs = args.map(arg => scrubber.scrubLogArg(arg));
      originalError.apply(console, scrubbedArgs);
    };

    console.warn = function(...args: any[]) {
      const scrubbedArgs = args.map(arg => scrubber.scrubLogArg(arg));
      originalWarn.apply(console, scrubbedArgs);
    };

    console.info = function(...args: any[]) {
      const scrubbedArgs = args.map(arg => scrubber.scrubLogArg(arg));
      originalInfo.apply(console, scrubbedArgs);
    };

    // Handle errors
    const errorHandler = (err: Error) => {
      if (err && err.message) {
        // Scrub error messages that might contain PII
        err.message = this.scrubString(err.message);
      }
      if (err && (err as any).response) {
        (err as any).response = this.scrubData((err as any).response);
      }
    };

    process.on('uncaughtException', errorHandler);
    process.on('unhandledRejection', errorHandler);

    // Restore original methods on response end
    res.on('finish', () => {
      console.log = originalWrite;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
      
      // Check performance
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      if (duration > 5) {
        console.warn(`Log scrubber middleware took ${duration.toFixed(2)}ms`);
      }
    });

    next();
  }

  /**
   * Scrub data recursively, handling objects and arrays
   */
  private scrubData(data: any, depth: number = 0): any {
    if (depth > this.maxDepth) {
      return '[MAX_DEPTH_EXCEEDED]';
    }

    if (data === null || data === undefined) {
      return data;
    }

    // Handle primitives
    if (typeof data !== 'object') {
      return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.scrubData(item, depth + 1));
    }

    // Handle objects
    const scrubbed: ScrubbedData = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (this.shouldRedactField(key)) {
        if (HASH_FIELDS.has(key.toLowerCase()) && typeof value === 'string') {
          scrubbed[key] = hashIpAddress(value);
        } else {
          scrubbed[key] = this.redactedValue;
        }
      } else if (typeof value === 'object' && value !== null) {
        scrubbed[key] = this.scrubData(value, depth + 1);
      } else {
        scrubbed[key] = value;
      }
    }

    return scrubbed;
  }

  /**
   * Scrub headers object
   */
  private scrubHeaders(headers: any): any {
    const scrubbed = { ...headers };
    
    // Redact authorization headers
    if (scrubbed.authorization) {
      scrubbed.authorization = this.redactedValue;
    }
    
    if (scrubbed['x-api-key']) {
      scrubbed['x-api-key'] = this.redactedValue;
    }
    
    // Hash IP addresses in headers
    if (scrubbed['x-forwarded-for']) {
      const ips = (scrubbed['x-forwarded-for'] as string).split(',');
      scrubbed['x-forwarded-for'] = ips.map(ip => hashIpAddress(ip.trim())).join(',');
    }
    
    if (scrubbed['x-real-ip']) {
      scrubbed['x-real-ip'] = hashIpAddress(scrubbed['x-real-ip']);
    }

    return scrubbed;
  }

  /**
   * Scrub individual log arguments
   */
  private scrubLogArg(arg: any): any {
    if (typeof arg === 'string') {
      return this.scrubString(arg);
    } else if (typeof arg === 'object' && arg !== null) {
      return this.scrubData(arg);
    }
    return arg;
  }

  /**
   * Scrub strings that might contain PII
   */
  private scrubString(str: string): string {
    // Simple email redaction
    str = str.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[EMAIL_REDACTED]');
    
    // Simple phone number redaction (various formats)
    str = str.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE_REDACTED]');
    
    // Simple SSN redaction
    str = str.replace(/\d{3}-\d{2}-\d{4}/g, '[SSN_REDACTED]');
    
    // Credit card number patterns
    str = str.replace(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, '[CARD_REDACTED]');
    
    // IP address redaction (but hash instead)
    str = str.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, (match) => hashIpAddress(match));
    
    return str;
  }

  /**
   * Check if a field should be redacted based on name
   */
  private shouldRedactField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();
    
    // Check cache first for performance
    const cached = this.scrubberCache.get(lowerFieldName);
    if (cached !== undefined) {
      return cached;
    }

    // Check exact matches
    if (PII_FIELDS.has(lowerFieldName)) {
      this.scrubberCache.set(lowerFieldName, true);
      return true;
    }

    // Check prefixes
    for (const prefix of PII_PREFIXES) {
      if (lowerFieldName.startsWith(prefix)) {
        this.scrubberCache.set(lowerFieldName, true);
        return true;
      }
    }

    // Check if field contains sensitive keywords
    const sensitiveKeywords = ['password', 'token', 'secret', 'key', 'auth'];
    for (const keyword of sensitiveKeywords) {
      if (lowerFieldName.includes(keyword)) {
        this.scrubberCache.set(lowerFieldName, true);
        return true;
      }
    }

    this.scrubberCache.set(lowerFieldName, false);
    return false;
  }
}

/**
 * Factory function to create log scrubber middleware
 */
export function createLogScrubberMiddleware(): LogScrubberMiddleware {
  return new LogScrubberMiddleware();
}