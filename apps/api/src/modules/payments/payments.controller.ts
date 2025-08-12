import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Headers,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { AuditLog } from '../../decorators/audit-log.decorator';
import { IdempotencyKey } from '../../decorators/idempotency.decorator';
import { extractIpFromRequest } from '../../utils/ip_hash';
import { Request } from 'express';

interface CreatePaymentIntentDto {
  orderId: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
  paymentMethodId?: string;
}

interface ProcessRefundDto {
  paymentIntentId: string;
  amount?: number;
  reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other';
  description?: string;
  metadata?: Record<string, any>;
}

interface PaymentIntentResponse {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, any>;
}

interface RefundResponse {
  id: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  reason: string;
  created: Date;
}

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);
  
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a payment intent for an order' })
  @ApiResponse({ status: 201, description: 'Payment intent created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Parental consent required' })
  @AuditLog('payment_intent_created')
  async createPaymentIntent(
    @Body() dto: CreatePaymentIntentDto,
    @CurrentUser() user: User,
    @IdempotencyKey() idempotencyKey: string,
    @Req() request: Request,
  ): Promise<PaymentIntentResponse> {
    const ipAddress = extractIpFromRequest(request);
    
    return this.paymentsService.createPaymentIntent({
      ...dto,
      userId: user.id,
      idempotencyKey,
      ipAddress,
    });
  }

  @Post('confirm/:intentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a payment intent' })
  @ApiResponse({ status: 200, description: 'Payment intent confirmed' })
  @ApiResponse({ status: 400, description: 'Invalid payment intent' })
  @AuditLog('payment_intent_confirmed')
  async confirmPaymentIntent(
    @Param('intentId') intentId: string,
    @CurrentUser() user: User,
    @Body() body: { paymentMethodId?: string },
  ): Promise<PaymentIntentResponse> {
    return this.paymentsService.confirmPaymentIntent(intentId, user.id, body.paymentMethodId);
  }

  @Get('intent/:intentId')
  @ApiOperation({ summary: 'Get payment intent status' })
  @ApiResponse({ status: 200, description: 'Payment intent details' })
  @ApiResponse({ status: 404, description: 'Payment intent not found' })
  async getPaymentIntent(
    @Param('intentId') intentId: string,
    @CurrentUser() user: User,
  ): Promise<PaymentIntentResponse> {
    return this.paymentsService.getPaymentIntent(intentId, user.id);
  }

  @Post('refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process a refund for a payment' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid refund request' })
  @AuditLog('payment_refunded')
  async processRefund(
    @Body() dto: ProcessRefundDto,
    @CurrentUser() user: User,
    @IdempotencyKey() idempotencyKey: string,
  ): Promise<RefundResponse> {
    return this.paymentsService.processRefund({
      ...dto,
      userId: user.id,
      idempotencyKey,
    });
  }

  @Get('history')
  @ApiOperation({ summary: 'Get payment history for the current user' })
  @ApiResponse({ status: 200, description: 'Payment history retrieved' })
  async getPaymentHistory(
    @CurrentUser() user: User,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ) {
    return this.paymentsService.getUserPaymentHistory(user.id, limit, offset);
  }

  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - missing signature or invalid body' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid webhook signature' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Body() rawBody: Buffer,
  ) {
    // Security: Fail fast if no signature provided
    if (!signature) {
      this.logger.warn('Webhook request received without stripe-signature header');
      throw new BadRequestException('Missing stripe-signature header');
    }

    // Note: This endpoint MUST receive raw body for signature verification
    // Configure your main.ts or module to bypass JSON parsing for this route:
    // app.use('/payments/webhook/stripe', express.raw({ type: 'application/json' }))
    
    try {
      return await this.paymentsService.handleWebhook(signature, rawBody);
    } catch (error) {
      // Log the error type for monitoring
      this.logger.error('Webhook processing failed:', {
        errorType: error.constructor.name,
        errorMessage: error.message,
        hasSignature: !!signature,
        bodyType: rawBody?.constructor?.name,
      });
      
      // Re-throw the error to maintain proper HTTP status codes
      throw error;
    }
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'Get saved payment methods for user' })
  @ApiResponse({ status: 200, description: 'Payment methods retrieved' })
  async getPaymentMethods(@CurrentUser() user: User) {
    return this.paymentsService.getUserPaymentMethods(user.id);
  }

  @Post('payment-methods/:methodId/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set default payment method' })
  @AuditLog('payment_method_default_updated')
  async setDefaultPaymentMethod(
    @Param('methodId') methodId: string,
    @CurrentUser() user: User,
  ) {
    return this.paymentsService.setDefaultPaymentMethod(user.id, methodId);
  }

  @Get('config')
  @ApiOperation({ summary: 'Get Stripe publishable key and config' })
  @ApiResponse({ status: 200, description: 'Stripe configuration' })
  async getStripeConfig() {
    return this.paymentsService.getPublicConfig();
  }
}