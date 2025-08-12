import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { StripeWebhookHandler } from '../../webhooks/stripe_live';
import { UsersModule } from '../users/users.module';

// Entity imports (these would be defined in separate entity files)
import { Payment } from './entities/payment.entity';
import { PaymentLedger } from './entities/payment-ledger.entity';
import { PaymentAudit } from './entities/payment-audit.entity';
import { StripeCustomer } from './entities/stripe-customer.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { Refund } from './entities/refund.entity';
import { Dispute } from './entities/dispute.entity';
import { PaymentMethod } from './entities/payment-method.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Payment,
      PaymentLedger,
      PaymentAudit,
      StripeCustomer,
      WebhookEvent,
      Refund,
      Dispute,
      PaymentMethod,
    ]),
    UsersModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    StripeService,
    StripeWebhookHandler,
  ],
  exports: [PaymentsService, StripeService],
})
export class PaymentsModule {}