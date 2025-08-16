import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { StripeWebhookHandler } from '../../webhooks/stripe_live';
import { UsersModule } from '../users/users.module';

// Entity imports
import { Payment } from './entities/payment.entity';
import { PaymentLedger } from './entities/payment-ledger.entity';
import { PaymentAudit } from './entities/payment-audit.entity';
import { StripeCustomer } from './entities/stripe-customer.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { Refund } from './entities/refund.entity';
import { Dispute } from './entities/dispute.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { ConnectedAccount } from './entities/connected-account.entity';
import { Transfer } from './entities/transfer.entity';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionItem } from './entities/subscription-item.entity';
import { Invoice } from './entities/invoice.entity';
import { RegistrationOrder } from './entities/registration-order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderDiscount } from './entities/order-discount.entity';
import { DiscountCode } from './entities/discount-code.entity';
import { RegistrationFee } from './entities/registration-fee.entity';

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
      ConnectedAccount,
      Transfer,
      Subscription,
      SubscriptionItem,
      Invoice,
      RegistrationOrder,
      OrderItem,
      OrderDiscount,
      DiscountCode,
      RegistrationFee,
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