/**
 * Example: Integrating PII Log Scrubber Middleware
 * 
 * This file demonstrates how to integrate the log scrubber middleware
 * into your NestJS application.
 */

import { Module, NestModule, MiddlewareConsumer, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LogScrubberMiddleware } from './log_scrubber';
import { ScrubbedLogger, LoggingInterceptor } from '../config/logging';

/**
 * Example 1: Global Logging Module
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'LOGGER',
      useFactory: (configService: ConfigService) => {
        return new ScrubbedLogger(configService);
      },
      inject: [ConfigService],
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: (configService: ConfigService) => {
        return new LoggingInterceptor(
          new ScrubbedLogger(configService),
          configService,
        );
      },
      inject: [ConfigService],
    },
  ],
  exports: ['LOGGER'],
})
export class LoggingModule {}

/**
 * Example 2: App Module with Middleware Configuration
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggingModule,
    // ... other modules
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply log scrubber middleware globally
    consumer
      .apply(LogScrubberMiddleware)
      .forRoutes('*');
    
    // Or apply to specific routes
    // consumer
    //   .apply(LogScrubberMiddleware)
    //   .forRoutes(
    //     { path: 'api/*', method: RequestMethod.ALL },
    //     { path: 'webhooks/*', method: RequestMethod.POST },
    //   );
  }
}

/**
 * Example 3: Main Application Bootstrap
 */
async function bootstrap() {
  const { NestFactory } = await import('@nestjs/core');
  const app = await NestFactory.create(AppModule, {
    // Use custom logger
    logger: false, // Disable default logger
  });

  // Get custom logger
  const configService = app.get(ConfigService);
  const logger = new ScrubbedLogger(configService);
  
  // Set as application logger
  app.useLogger(logger);

  // Environment variables for configuration
  const port = configService.get('PORT', 3000);
  
  // Set environment variables for PII scrubbing
  process.env.IP_HASH_PEPPER = configService.get('IP_HASH_PEPPER', 'gametriq-secure-pepper-' + Date.now());
  process.env.ENABLE_PII_SCRUBBING = configService.get('ENABLE_PII_SCRUBBING', 'true');
  process.env.LOG_LEVEL = configService.get('LOG_LEVEL', 'log');

  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`, 'Bootstrap');
}

/**
 * Example 4: Using the Logger in Services
 */
import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class ExampleService {
  constructor(
    @Inject('LOGGER') private readonly logger: ScrubbedLogger,
  ) {}

  async processPayment(paymentData: any) {
    // Log will automatically scrub PII
    this.logger.log({
      action: 'process_payment',
      userId: paymentData.userId,
      email: paymentData.email, // Will be redacted
      card_number: paymentData.card_number, // Will be redacted
      amount: paymentData.amount, // Not redacted
    }, 'PaymentService');

    try {
      // Process payment...
      const result = await this.doPaymentProcessing(paymentData);
      
      this.logger.log({
        action: 'payment_success',
        transactionId: result.id,
        status: 'completed',
      }, 'PaymentService');
      
      return result;
    } catch (error) {
      // Error details will be scrubbed
      this.logger.error(
        {
          action: 'payment_failed',
          error: error.message,
          paymentData, // Will be scrubbed
        },
        error.stack,
        'PaymentService',
      );
      throw error;
    }
  }

  private async doPaymentProcessing(data: any) {
    // Implementation...
    return { id: 'txn_12345' };
  }
}

/**
 * Example 5: Environment Configuration (.env file)
 */
const envExample = `
# Logging Configuration
LOG_LEVEL=log                    # Options: error, warn, log, debug, verbose
ENABLE_PII_SCRUBBING=true        # Enable/disable PII scrubbing
ENABLE_REQUEST_LOGGING=true      # Log incoming requests
ENABLE_RESPONSE_LOGGING=false    # Log outgoing responses (be careful with this)
ENABLE_ERROR_LOGGING=true        # Log errors
MAX_LOG_RESPONSE_SIZE=1000       # Maximum response size to log
LOG_EXCLUDE_PATHS=/health,/metrics  # Comma-separated paths to exclude from logging

# Security
IP_HASH_PEPPER=your-secret-pepper-here  # Secret for hashing IP addresses
`;

/**
 * Example 6: Testing the Middleware
 */
import { Test, TestingModule } from '@nestjs/testing';

describe('PII Scrubbing Integration', () => {
  let app: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply middleware
    const middleware = new LogScrubberMiddleware();
    app.use(middleware.use.bind(middleware));
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should scrub PII from request logs', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/users')
      .send({
        email: 'test@example.com',
        phone: '555-123-4567',
        name: 'Test User',
      })
      .expect(201);

    // Verify logs don't contain PII
    // (You would need to capture console output to verify)
  });
});

export { LoggingModule, AppModule, bootstrap };