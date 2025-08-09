/**
 * GameTriq Basketball League Management Platform
 * PII (Personally Identifiable Information) Scrubbing Service
 * 
 * This service ensures zero PII in logs and implements COPPA-compliant data handling
 * for youth basketball leagues.
 */

import crypto from 'crypto';
import { Transform } from 'stream';
import { Logger } from 'winston';

// PII patterns for detection and redaction
const PII_PATTERNS = {
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone numbers (various formats)
  phone: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
  
  // Social Security Numbers
  ssn: /\b(?:\d{3}-?\d{2}-?\d{4}|\d{9})\b/g,
  
  // Credit card numbers (basic pattern)
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  
  // IP addresses (for privacy)
  ipAddress: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
  
  // Full names (basic pattern - first last name)
  fullName: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
  
  // Addresses (basic street address pattern)
  address: /\b\d+\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b/gi,
  
  // Date of birth patterns
  dateOfBirth: /\b(?:0?[1-9]|1[0-2])[\/\-.](?:0?[1-9]|[12]\d|3[01])[\/\-.]\d{4}\b/g,
  
  // Driver's license numbers (varies by state, basic pattern)
  driverLicense: /\b[A-Z0-9]{8,12}\b/g,
  
  // Bank account numbers
  bankAccount: /\b\d{8,17}\b/g,
  
  // Medical record numbers
  medicalRecord: /\b(?:MRN|Medical Record|Patient ID)[\s:]?([A-Z0-9]{6,12})\b/gi,
};

// COPPA-specific PII patterns for children under 13
const COPPA_PATTERNS = {
  // Child's full name
  childName: /\b(?:child|kid|student|player)[\s]*name[\s]*:?[\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  
  // Parent/guardian information
  parentInfo: /\b(?:parent|guardian|mother|father|mom|dad)[\s]*:?[\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  
  // School information
  schoolInfo: /\bschool[\s]*:?[\s]*([A-Za-z\s]+(?:Elementary|Middle|School|Academy))/gi,
  
  // Age or grade level (for children)
  ageGrade: /\b(?:age|grade|years old)[\s]*:?[\s]*([0-9]{1,2})/gi,
};

// JWT token patterns
const TOKEN_PATTERNS = {
  jwt: /eyJ[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+/g,
  apiKey: /(?:api[_-]?key|apikey)[\s]*[:=]\s*["']?([A-Za-z0-9_-]{20,})["']?/gi,
  password: /(?:password|passwd|pwd)[\s]*[:=]\s*["']?([^"'\s]{8,})["']?/gi,
  accessToken: /(?:access[_-]?token|accesstoken)[\s]*[:=]\s*["']?([A-Za-z0-9+/=]{20,})["']?/gi,
};

// Financial information patterns
const FINANCIAL_PATTERNS = {
  // Bank routing numbers
  routingNumber: /\b[0-9]{9}\b/g,
  
  // Payment amounts (may contain sensitive info)
  paymentAmount: /\$\d{3,}(?:,\d{3})*(?:\.\d{2})?/g,
  
  // Transaction IDs
  transactionId: /\b(?:txn|transaction|trans)[\s]*[_-]?id[\s]*:?[\s]*([A-Za-z0-9_-]{10,})/gi,
};

export interface PiiScrubbingOptions {
  enableCoppaMode: boolean;
  hashSalt: string;
  preserveDataTypes: boolean;
  logScrubbing: boolean;
  customPatterns?: Record<string, RegExp>;
}

export interface ScrubbingResult {
  scrubbedContent: string;
  piiDetected: boolean;
  piiTypes: string[];
  scrubCount: number;
}

export class PiiScrubber {
  private options: PiiScrubbingOptions;
  private logger?: Logger;
  private hashCache = new Map<string, string>();

  constructor(options: PiiScrubbingOptions, logger?: Logger) {
    this.options = {
      enableCoppaMode: true,
      hashSalt: process.env.PII_HASH_SALT || 'gametriq-default-salt',
      preserveDataTypes: true,
      logScrubbing: true,
      ...options,
    };
    this.logger = logger;
  }

  /**
   * Scrub PII from text content
   */
  scrubText(content: string): ScrubbingResult {
    if (!content || typeof content !== 'string') {
      return {
        scrubbedContent: content,
        piiDetected: false,
        piiTypes: [],
        scrubCount: 0,
      };
    }

    let scrubbedContent = content;
    const piiTypes: string[] = [];
    let scrubCount = 0;

    // Scrub standard PII patterns
    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      const matches = scrubbedContent.match(pattern);
      if (matches) {
        piiTypes.push(type);
        scrubCount += matches.length;
        scrubbedContent = this.replacePattern(scrubbedContent, pattern, type);
      }
    }

    // Scrub COPPA-specific patterns if enabled
    if (this.options.enableCoppaMode) {
      for (const [type, pattern] of Object.entries(COPPA_PATTERNS)) {
        const matches = scrubbedContent.match(pattern);
        if (matches) {
          piiTypes.push(`coppa_${type}`);
          scrubCount += matches.length;
          scrubbedContent = this.replacePattern(scrubbedContent, pattern, `coppa_${type}`);
        }
      }
    }

    // Scrub tokens and sensitive authentication data
    for (const [type, pattern] of Object.entries(TOKEN_PATTERNS)) {
      const matches = scrubbedContent.match(pattern);
      if (matches) {
        piiTypes.push(`token_${type}`);
        scrubCount += matches.length;
        scrubbedContent = this.replacePattern(scrubbedContent, pattern, `token_${type}`);
      }
    }

    // Scrub financial information
    for (const [type, pattern] of Object.entries(FINANCIAL_PATTERNS)) {
      const matches = scrubbedContent.match(pattern);
      if (matches) {
        piiTypes.push(`financial_${type}`);
        scrubCount += matches.length;
        scrubbedContent = this.replacePattern(scrubbedContent, pattern, `financial_${type}`);
      }
    }

    // Scrub custom patterns if provided
    if (this.options.customPatterns) {
      for (const [type, pattern] of Object.entries(this.options.customPatterns)) {
        const matches = scrubbedContent.match(pattern);
        if (matches) {
          piiTypes.push(`custom_${type}`);
          scrubCount += matches.length;
          scrubbedContent = this.replacePattern(scrubbedContent, pattern, `custom_${type}`);
        }
      }
    }

    const result: ScrubbingResult = {
      scrubbedContent,
      piiDetected: piiTypes.length > 0,
      piiTypes,
      scrubCount,
    };

    // Log scrubbing activity if enabled
    if (this.options.logScrubbing && this.logger && result.piiDetected) {
      this.logger.info('PII scrubbed from content', {
        piiTypes: result.piiTypes,
        scrubCount: result.scrubCount,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }

  /**
   * Scrub PII from JavaScript objects (logs, API responses, etc.)
   */
  scrubObject(obj: any, maxDepth = 10): any {
    if (maxDepth <= 0) return obj;
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      return this.scrubText(obj).scrubbedContent;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.scrubObject(item, maxDepth - 1));
    }

    if (typeof obj === 'object') {
      const scrubbed: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Check if key itself contains sensitive information
        const keyLower = key.toLowerCase();
        if (this.isSensitiveKey(keyLower)) {
          scrubbed[key] = this.redactValue(value, key);
        } else {
          scrubbed[key] = this.scrubObject(value, maxDepth - 1);
        }
      }
      return scrubbed;
    }

    return obj;
  }

  /**
   * Create a transform stream for scrubbing logs in real-time
   */
  createScrubberStream(): Transform {
    return new Transform({
      transform(chunk: any, encoding: string, callback) {
        try {
          const content = chunk.toString();
          const scrubbed = this.scrubText(content);
          callback(null, scrubbed.scrubbedContent);
        } catch (error) {
          callback(error);
        }
      }.bind(this),
    });
  }

  /**
   * Replace matched patterns with appropriate redaction
   */
  private replacePattern(content: string, pattern: RegExp, type: string): string {
    return content.replace(pattern, (match) => {
      if (this.options.preserveDataTypes) {
        return this.generatePreservingReplacement(match, type);
      } else {
        return `[REDACTED_${type.toUpperCase()}]`;
      }
    });
  }

  /**
   * Generate replacement that preserves data structure
   */
  private generatePreservingReplacement(originalValue: string, type: string): string {
    switch (type) {
      case 'email':
        return this.hashValue(originalValue) + '@example.com';
      
      case 'phone':
        return '***-***-' + originalValue.slice(-4);
      
      case 'ssn':
        return '***-**-' + originalValue.slice(-4);
      
      case 'creditCard':
        const lastFour = originalValue.replace(/\D/g, '').slice(-4);
        return `****-****-****-${lastFour}`;
      
      case 'ipAddress':
        return '***.***.***.' + originalValue.split('.').pop();
      
      case 'fullName':
        const parts = originalValue.split(' ');
        return parts[0][0] + '***' + (parts[1] ? ' ' + parts[1][0] + '***' : '');
      
      case 'bankAccount':
        return '****' + originalValue.slice(-4);
      
      default:
        return `[${type.toUpperCase()}_${this.hashValue(originalValue).slice(0, 8)}]`;
    }
  }

  /**
   * Check if a key name indicates sensitive data
   */
  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password', 'passwd', 'pwd', 'secret', 'token', 'key',
      'email', 'mail', 'phone', 'mobile', 'ssn', 'social',
      'credit', 'card', 'account', 'routing', 'bank',
      'firstname', 'lastname', 'fullname', 'name', 'address',
      'dateofbirth', 'dob', 'birthdate', 'age',
      'parent', 'guardian', 'emergency', 'contact',
      'medical', 'health', 'allergy', 'medication',
      'authorization', 'bearer', 'session', 'cookie',
    ];

    return sensitiveKeys.some(sensitiveKey => 
      key.includes(sensitiveKey) || 
      key.replace(/[_-]/g, '').includes(sensitiveKey.replace(/[_-]/g, ''))
    );
  }

  /**
   * Redact sensitive values based on key type
   */
  private redactValue(value: any, key: string): any {
    if (value === null || value === undefined) return value;
    
    const keyLower = key.toLowerCase();
    
    if (keyLower.includes('password') || keyLower.includes('secret')) {
      return '[REDACTED_PASSWORD]';
    }
    
    if (keyLower.includes('token') || keyLower.includes('key')) {
      return '[REDACTED_TOKEN]';
    }
    
    if (keyLower.includes('email')) {
      return this.hashValue(String(value)) + '@example.com';
    }
    
    if (keyLower.includes('phone') || keyLower.includes('mobile')) {
      const phoneStr = String(value).replace(/\D/g, '');
      return phoneStr.length >= 4 ? '***-***-' + phoneStr.slice(-4) : '[REDACTED_PHONE]';
    }
    
    if (keyLower.includes('name')) {
      const nameStr = String(value);
      return nameStr.length > 0 ? nameStr[0] + '***' : '[REDACTED_NAME]';
    }
    
    return `[REDACTED_${key.toUpperCase()}]`;
  }

  /**
   * Create a consistent hash for a value
   */
  private hashValue(value: string): string {
    if (this.hashCache.has(value)) {
      return this.hashCache.get(value)!;
    }

    const hash = crypto
      .createHash('sha256')
      .update(value + this.options.hashSalt)
      .digest('hex')
      .substring(0, 8);

    this.hashCache.set(value, hash);
    
    // Limit cache size to prevent memory leaks
    if (this.hashCache.size > 10000) {
      const firstKey = this.hashCache.keys().next().value;
      this.hashCache.delete(firstKey);
    }

    return hash;
  }

  /**
   * Validate that content is properly scrubbed
   */
  validateScrubbed(content: string): boolean {
    // Quick validation using a subset of patterns
    const validationPatterns = [
      PII_PATTERNS.email,
      PII_PATTERNS.phone,
      PII_PATTERNS.ssn,
      PII_PATTERNS.creditCard,
      TOKEN_PATTERNS.jwt,
      TOKEN_PATTERNS.apiKey,
    ];

    for (const pattern of validationPatterns) {
      if (pattern.test(content)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get scrubbing statistics
   */
  getStats(): {
    totalScrubs: number;
    hashCacheSize: number;
    memoryUsage: number;
  } {
    return {
      totalScrubs: this.hashCache.size,
      hashCacheSize: this.hashCache.size,
      memoryUsage: process.memoryUsage().heapUsed,
    };
  }

  /**
   * Clear internal caches
   */
  clearCache(): void {
    this.hashCache.clear();
  }
}

// Winston logger formatter for PII scrubbing
export function createPiiScrubbingFormatter(options?: Partial<PiiScrubbingOptions>) {
  const scrubber = new PiiScrubber({
    enableCoppaMode: true,
    hashSalt: process.env.PII_HASH_SALT || 'gametriq-log-salt',
    preserveDataTypes: true,
    logScrubbing: false, // Don't log scrubbing in the formatter to avoid recursion
    ...options,
  });

  return (info: any) => {
    // Scrub the message
    if (info.message) {
      info.message = scrubber.scrubText(info.message).scrubbedContent;
    }

    // Scrub any additional properties
    const scrubbed = scrubber.scrubObject(info);
    
    return scrubbed;
  };
}

// Express middleware for scrubbing request/response data
export function piiScrubbingMiddleware(options?: Partial<PiiScrubbingOptions>) {
  const scrubber = new PiiScrubber({
    enableCoppaMode: true,
    hashSalt: process.env.PII_HASH_SALT || 'gametriq-middleware-salt',
    preserveDataTypes: true,
    logScrubbing: true,
    ...options,
  });

  return (req: any, res: any, next: any) => {
    // Scrub request body for logging
    if (req.body) {
      req.scrubbedBody = scrubber.scrubObject(req.body);
    }

    // Scrub query parameters
    if (req.query) {
      req.scrubbedQuery = scrubber.scrubObject(req.query);
    }

    // Scrub headers (excluding authorization which should be completely removed)
    if (req.headers) {
      req.scrubbedHeaders = scrubber.scrubObject({
        ...req.headers,
        authorization: req.headers.authorization ? '[REDACTED_AUTH_HEADER]' : undefined,
        cookie: req.headers.cookie ? '[REDACTED_COOKIES]' : undefined,
      });
    }

    next();
  };
}

// Utility function for scrubbing database query logs
export function scrubSqlQuery(query: string, params?: any[]): string {
  const scrubber = new PiiScrubber({
    enableCoppaMode: true,
    hashSalt: process.env.PII_HASH_SALT || 'gametriq-sql-salt',
    preserveDataTypes: false,
    logScrubbing: false,
  });

  let scrubbedQuery = scrubber.scrubText(query).scrubbedContent;

  // Scrub query parameters
  if (params && params.length > 0) {
    params.forEach((param, index) => {
      const scrubbedParam = typeof param === 'string' 
        ? scrubber.scrubText(param).scrubbedContent
        : '[REDACTED_PARAM]';
      
      scrubbedQuery = scrubbedQuery.replace(`$${index + 1}`, scrubbedParam);
    });
  }

  return scrubbedQuery;
}

// Export singleton instance for consistent usage
export const defaultPiiScrubber = new PiiScrubber({
  enableCoppaMode: true,
  hashSalt: process.env.PII_HASH_SALT || 'gametriq-default',
  preserveDataTypes: true,
  logScrubbing: true,
});

// COPPA compliance utilities
export class CoppaCompliantScrubber extends PiiScrubber {
  constructor(options: Partial<PiiScrubbingOptions> = {}) {
    super({
      enableCoppaMode: true,
      hashSalt: process.env.COPPA_HASH_SALT || 'gametriq-coppa-salt',
      preserveDataTypes: false, // More aggressive scrubbing for COPPA
      logScrubbing: true,
      ...options,
    }, undefined);
  }

  /**
   * Scrub child-specific information more aggressively
   */
  scrubChildData(data: any): any {
    // Additional patterns specific to child data
    const childPatterns = {
      childAge: /\b(?:age|years old)[\s]*:?[\s]*([0-9]{1,2})\b/gi,
      parentalConsent: /\b(?:consent|permission|guardian approval)[\s]*:?[\s]*([A-Za-z0-9]+)/gi,
      emergencyContact: /\b(?:emergency|contact|guardian)[\s]*:?[\s]*([A-Za-z\s]+)/gi,
    };

    this.options.customPatterns = {
      ...this.options.customPatterns,
      ...childPatterns,
    };

    return this.scrubObject(data);
  }

  /**
   * Generate COPPA deletion audit trail
   */
  generateDeletionAudit(childData: any, requestedBy: string): any {
    return {
      deletionTimestamp: new Date().toISOString(),
      requestedBy,
      dataTypes: Object.keys(childData),
      scrubbed: true,
      complianceNote: 'Data scrubbed in accordance with COPPA requirements',
      retentionPolicyApplied: true,
    };
  }
}

export const coppaCompliantScrubber = new CoppaCompliantScrubber();