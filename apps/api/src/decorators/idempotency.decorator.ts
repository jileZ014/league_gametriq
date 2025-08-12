import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * Idempotency key decorator
 * Extracts idempotency key from request headers or generates a new one
 * Used to ensure payment operations are not duplicated
 */
export const IdempotencyKey = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    
    // Check for idempotency key in headers
    const idempotencyKey = request.headers['idempotency-key'] || 
                          request.headers['x-idempotency-key'];
    
    if (idempotencyKey) {
      return idempotencyKey;
    }
    
    // Generate a new idempotency key if not provided
    // This ensures the operation can be retried safely
    const generatedKey = `${request.method}-${request.path}-${uuidv4()}`;
    
    // Store in request for potential logging
    request.idempotencyKey = generatedKey;
    
    return generatedKey;
  },
);