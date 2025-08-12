import { LoggerService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogScrubberMiddleware } from '../middleware/log_scrubber';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * Logging Configuration
 * Configures application-wide logging with PII scrubbing
 */

export interface LogLevel {
  error: boolean;
  warn: boolean;
  log: boolean;
  debug: boolean;
  verbose: boolean;
}

export interface LoggingConfig {
  level: keyof LogLevel;
  enablePiiScrubbing: boolean;
  enableRequestLogging: boolean;
  enableResponseLogging: boolean;
  enableErrorLogging: boolean;
  maxResponseSize: number;
  excludePaths: string[];
}

@Injectable()
export class ScrubbedLogger implements LoggerService {
  private readonly config: LoggingConfig;
  private readonly scrubber = createLogScrubberMiddleware();

  constructor(private readonly configService: ConfigService) {
    this.config = {
      level: this.configService.get<keyof LogLevel>('LOG_LEVEL', 'log'),
      enablePiiScrubbing: this.configService.get<boolean>('ENABLE_PII_SCRUBBING', true),
      enableRequestLogging: this.configService.get<boolean>('ENABLE_REQUEST_LOGGING', true),
      enableResponseLogging: this.configService.get<boolean>('ENABLE_RESPONSE_LOGGING', false),
      enableErrorLogging: this.configService.get<boolean>('ENABLE_ERROR_LOGGING', true),
      maxResponseSize: this.configService.get<number>('MAX_LOG_RESPONSE_SIZE', 1000),
      excludePaths: this.configService.get<string>('LOG_EXCLUDE_PATHS', '').split(',').filter(Boolean),
    };
  }

  log(message: any, context?: string) {
    if (this.isLevelEnabled('log')) {
      this.writeLog('log', message, context);
    }
  }

  error(message: any, trace?: string, context?: string) {
    if (this.isLevelEnabled('error')) {
      this.writeLog('error', message, context, trace);
    }
  }

  warn(message: any, context?: string) {
    if (this.isLevelEnabled('warn')) {
      this.writeLog('warn', message, context);
    }
  }

  debug(message: any, context?: string) {
    if (this.isLevelEnabled('debug')) {
      this.writeLog('debug', message, context);
    }
  }

  verbose(message: any, context?: string) {
    if (this.isLevelEnabled('verbose')) {
      this.writeLog('verbose', message, context);
    }
  }

  private writeLog(level: string, message: any, context?: string, trace?: string) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context,
      message: this.formatMessage(message),
      ...(trace && { trace }),
    };

    // Apply PII scrubbing if enabled
    const output = this.config.enablePiiScrubbing ? 
      this.scrubData(logEntry) : logEntry;

    // Use appropriate console method
    const consoleMethod = level === 'error' ? console.error : 
                         level === 'warn' ? console.warn : 
                         console.log;

    consoleMethod(JSON.stringify(output));
  }

  private formatMessage(message: any): any {
    if (message instanceof Error) {
      return {
        name: message.name,
        message: message.message,
        stack: message.stack,
      };
    }
    return message;
  }

  private scrubData(data: any): any {
    // Delegate to scrubber middleware logic
    return this.scrubber['scrubData'](data);
  }

  private isLevelEnabled(level: keyof LogLevel): boolean {
    const levels: LogLevel = {
      error: true,
      warn: true,
      log: true,
      debug: false,
      verbose: false,
    };

    // Set levels based on configured level
    switch (this.config.level) {
      case 'error':
        levels.warn = false;
        levels.log = false;
        break;
      case 'warn':
        levels.log = false;
        break;
      case 'debug':
        levels.debug = true;
        break;
      case 'verbose':
        levels.debug = true;
        levels.verbose = true;
        break;
    }

    return levels[level];
  }
}

/**
 * Request/Response logging interceptor
 */
@Injectable()
export class LoggingInterceptor {
  constructor(
    private readonly logger: ScrubbedLogger,
    private readonly configService: ConfigService,
  ) {}

  intercept(context: any, next: any) {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Check if path should be excluded
    const excludePaths = this.configService.get<string>('LOG_EXCLUDE_PATHS', '').split(',').filter(Boolean);
    if (excludePaths.some(path => request.path.includes(path))) {
      return next.handle();
    }

    // Log request
    if (this.configService.get<boolean>('ENABLE_REQUEST_LOGGING', true)) {
      this.logger.log({
        type: 'request',
        method: request.method,
        path: request.path,
        query: request.query,
        body: this.truncateBody(request.body),
        headers: this.sanitizeHeaders(request.headers),
        ip: request.ip,
      }, 'HTTP');
    }

    return next.handle().pipe(
      // Log response
      tap((data: any) => {
        if (this.configService.get<boolean>('ENABLE_RESPONSE_LOGGING', false)) {
          const duration = Date.now() - startTime;
          this.logger.log({
            type: 'response',
            method: request.method,
            path: request.path,
            statusCode: response.statusCode,
            duration,
            body: this.truncateBody(data),
          }, 'HTTP');
        }
      }),
      // Log errors
      catchError((error: any) => {
        if (this.configService.get<boolean>('ENABLE_ERROR_LOGGING', true)) {
          const duration = Date.now() - startTime;
          this.logger.error({
            type: 'error',
            method: request.method,
            path: request.path,
            statusCode: error.status || 500,
            duration,
            error: {
              name: error.name,
              message: error.message,
              response: error.response,
            },
          }, error.stack, 'HTTP');
        }
        throw error;
      }),
    );
  }

  private truncateBody(body: any): any {
    const maxSize = this.configService.get<number>('MAX_LOG_RESPONSE_SIZE', 1000);
    const bodyStr = JSON.stringify(body);
    
    if (bodyStr.length > maxSize) {
      return {
        truncated: true,
        size: bodyStr.length,
        preview: bodyStr.substring(0, maxSize) + '...',
      };
    }
    
    return body;
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    delete sanitized.cookie;
    delete sanitized['set-cookie'];
    
    return sanitized;
  }
}

// Helper to configure logging module
export function configureLogging(configService: ConfigService) {
  return {
    logger: new ScrubbedLogger(configService),
    interceptor: new LoggingInterceptor(
      new ScrubbedLogger(configService),
      configService,
    ),
  };
}

// Re-export for convenience
export { createLogScrubberMiddleware } from '../middleware/log_scrubber';

// Type definitions for better IDE support
declare module '@nestjs/common' {
  interface Logger {
    log(message: any, context?: string): void;
    error(message: any, trace?: string, context?: string): void;
    warn(message: any, context?: string): void;
    debug(message: any, context?: string): void;
    verbose(message: any, context?: string): void;
  }
}