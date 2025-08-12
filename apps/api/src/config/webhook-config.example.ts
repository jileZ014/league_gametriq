import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import * as express from 'express';

/**
 * Example configuration for webhook endpoints that require raw body parsing
 * 
 * IMPORTANT: Webhook signature verification requires the raw request body.
 * By default, NestJS/Express parses JSON bodies, which breaks signature verification.
 * 
 * This example shows how to configure your main.ts to handle webhooks properly.
 */

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable automatic body parsing
  });

  // Configure raw body parsing for Stripe webhooks
  app.use(
    '/payments/webhook/stripe',
    express.raw({ 
      type: 'application/json',
      limit: '10mb', // Stripe recommends a higher limit for webhooks
    })
  );

  // Configure JSON parsing for all other routes
  app.use(express.json({ limit: '1mb' }));

  // Alternative approach: Using a middleware function
  app.use((req: any, res: any, next: any) => {
    if (req.originalUrl === '/payments/webhook/stripe') {
      // Skip JSON parsing for webhook endpoint
      express.raw({ type: 'application/json' })(req, res, next);
    } else {
      express.json()(req, res, next);
    }
  });

  await app.listen(3000);
}

/**
 * Alternative: Configure in a specific module
 */
export function configureWebhooks(app: any) {
  // List of webhook endpoints that need raw body
  const webhookEndpoints = [
    '/payments/webhook/stripe',
    '/webhooks/github',
    '/webhooks/slack',
  ];

  webhookEndpoints.forEach(endpoint => {
    app.use(
      endpoint,
      express.raw({ 
        type: 'application/json',
        verify: (req: any, res: any, buf: Buffer) => {
          // Store raw body for signature verification
          req.rawBody = buf;
        }
      })
    );
  });
}

/**
 * Webhook Security Best Practices:
 * 
 * 1. Always verify webhook signatures
 * 2. Use HTTPS endpoints only
 * 3. Validate webhook source IPs if possible
 * 4. Implement idempotency to handle duplicate events
 * 5. Process webhooks asynchronously
 * 6. Set reasonable timeouts
 * 7. Log all webhook events for audit trail
 * 8. Monitor webhook failures and implement retry logic
 * 9. Rotate webhook secrets periodically
 * 10. Fail closed - reject any webhook with invalid signature
 */