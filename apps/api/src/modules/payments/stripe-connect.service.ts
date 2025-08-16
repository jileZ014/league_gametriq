import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Import actual entities
import { ConnectedAccount } from './entities/connected-account.entity';
import { Transfer } from './entities/transfer.entity';

@Injectable()
export class StripeConnectService {
  private readonly logger = new Logger(StripeConnectService.name);
  private readonly testMode: boolean;

  constructor(
    @InjectRepository(ConnectedAccount)
    private accountRepository: Repository<ConnectedAccount>,
    @InjectRepository(Transfer)
    private transferRepository: Repository<Transfer>,
    private stripeService: StripeService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.testMode = this.configService.get('STRIPE_TEST_MODE', 'true') === 'true';
  }

  /**
   * Create a Stripe Connect account for referees, leagues, or venues
   */
  async createConnectedAccount(params: {
    userId: string;
    accountType: 'referee' | 'league' | 'venue';
    email: string;
    businessProfile?: {
      name?: string;
      url?: string;
      mcc?: string;
      supportPhone?: string;
      supportEmail?: string;
    };
    individual?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      ssnLast4?: string;
      dateOfBirth?: {
        day: number;
        month: number;
        year: number;
      };
      address?: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
      };
    };
    metadata?: Record<string, any>;
  }): Promise<ConnectedAccount> {
    const { userId, accountType, email, businessProfile, individual, metadata } = params;

    // Check if account already exists
    const existingAccount = await this.accountRepository.findOne({
      where: { userId, accountType },
    });

    if (existingAccount) {
      throw new BadRequestException(`${accountType} account already exists for user`);
    }

    try {
      // Create Express account for simplified onboarding
      const account = await this.stripeService.getStripeInstance().accounts.create({
        type: 'express',
        country: 'US',
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: businessProfile ? {
          name: businessProfile.name,
          url: businessProfile.url,
          mcc: businessProfile.mcc || this.getDefaultMcc(accountType),
          support_phone: businessProfile.supportPhone,
          support_email: businessProfile.supportEmail || email,
        } : {
          mcc: this.getDefaultMcc(accountType),
          support_email: email,
        },
        individual: individual ? {
          first_name: individual.firstName,
          last_name: individual.lastName,
          phone: individual.phone,
          email: individual.email || email,
          ssn_last_4: individual.ssnLast4,
          dob: individual.dateOfBirth,
          address: individual.address,
        } : undefined,
        metadata: {
          ...metadata,
          userId,
          accountType,
          environment: this.testMode ? 'test' : 'live',
        },
      });

      // Save account record
      const connectedAccount = await this.accountRepository.save({
        userId,
        stripeAccountId: account.id,
        type: 'express',
        accountType,
        status: 'pending',
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        capabilities: account.capabilities,
        metadata: {
          ...metadata,
          stripeAccountDetails: account,
        },
      });

      this.logger.log(`Connected account created: ${account.id} for user ${userId} (${accountType})`);

      // Emit event
      this.eventEmitter.emit('payment.connect.account.created', {
        account: connectedAccount,
        stripeAccount: account,
      });

      return connectedAccount;
    } catch (error) {
      this.logger.error(`Failed to create connected account for user ${userId}:`, error);
      throw new BadRequestException(`Failed to create ${accountType} account: ${error.message}`);
    }
  }

  /**
   * Create account link for onboarding
   */
  async createAccountLink(params: {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
    type?: 'account_onboarding' | 'account_update';
  }): Promise<Stripe.AccountLink> {
    const { accountId, refreshUrl, returnUrl, type = 'account_onboarding' } = params;

    try {
      const accountLink = await this.stripeService.getStripeInstance().accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type,
      });

      this.logger.log(`Account link created for account ${accountId}`);
      return accountLink;
    } catch (error) {
      this.logger.error(`Failed to create account link for ${accountId}:`, error);
      throw new BadRequestException('Failed to create account onboarding link');
    }
  }

  /**
   * Create a payment with destination charge to connected account
   */
  async createDestinationPayment(params: {
    amount: number;
    currency: string;
    destinationAccountId: string;
    applicationFeeAmount: number;
    description: string;
    metadata?: Record<string, any>;
    paymentMethodId?: string;
    customerId?: string;
    idempotencyKey: string;
  }): Promise<Stripe.PaymentIntent> {
    const {
      amount,
      currency,
      destinationAccountId,
      applicationFeeAmount,
      description,
      metadata,
      paymentMethodId,
      customerId,
      idempotencyKey,
    } = params;

    // Validate destination account
    const account = await this.accountRepository.findOne({
      where: { stripeAccountId: destinationAccountId },
    });

    if (!account) {
      throw new NotFoundException('Destination account not found');
    }

    if (!account.chargesEnabled) {
      throw new BadRequestException('Destination account cannot accept charges');
    }

    try {
      const paymentIntent = await this.stripeService.getStripeInstance().paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        application_fee_amount: Math.round(applicationFeeAmount * 100),
        transfer_data: {
          destination: destinationAccountId,
        },
        description,
        metadata: {
          ...metadata,
          destinationAccountId,
          applicationFeeAmount,
        },
        payment_method: paymentMethodId,
        customer: customerId,
        confirmation_method: 'manual',
        confirm: false,
      }, {
        idempotencyKey,
      });

      this.logger.log(`Destination payment created: ${paymentIntent.id} to account ${destinationAccountId}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error('Failed to create destination payment:', error);
      throw new BadRequestException(`Payment creation failed: ${error.message}`);
    }
  }

  /**
   * Create transfer to connected account
   */
  async createTransfer(params: {
    paymentId: string;
    destinationAccountId: string;
    amount: number;
    currency: string;
    description: string;
    metadata?: Record<string, any>;
    idempotencyKey: string;
  }): Promise<Transfer> {
    const { paymentId, destinationAccountId, amount, currency, description, metadata, idempotencyKey } = params;

    // Validate destination account
    const account = await this.accountRepository.findOne({
      where: { stripeAccountId: destinationAccountId },
    });

    if (!account) {
      throw new NotFoundException('Destination account not found');
    }

    if (!account.payoutsEnabled) {
      throw new BadRequestException('Destination account cannot receive payouts');
    }

    try {
      const transfer = await this.stripeService.getStripeInstance().transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        destination: destinationAccountId,
        description,
        metadata: {
          ...metadata,
          paymentId,
        },
      }, {
        idempotencyKey,
      });

      // Save transfer record
      const transferRecord = await this.transferRepository.save({
        paymentId,
        destinationAccountId,
        amount,
        currency,
        transferId: transfer.id,
        status: 'pending',
        description,
        metadata: {
          ...metadata,
          stripeTransfer: transfer,
        },
      });

      this.logger.log(`Transfer created: ${transfer.id} to account ${destinationAccountId}`);

      // Emit event
      this.eventEmitter.emit('payment.transfer.created', {
        transfer: transferRecord,
        stripeTransfer: transfer,
      });

      return transferRecord;
    } catch (error) {
      this.logger.error('Failed to create transfer:', error);
      throw new BadRequestException(`Transfer creation failed: ${error.message}`);
    }
  }

  /**
   * Process referee payment for game officiation
   */
  async processRefereePayment(params: {
    gameId: string;
    refereeUserId: string;
    baseAmount: number;
    bonusAmount?: number;
    gameDate: Date;
    division: string;
    metadata?: Record<string, any>;
  }): Promise<Transfer> {
    const { gameId, refereeUserId, baseAmount, bonusAmount = 0, gameDate, division, metadata } = params;

    // Get referee account
    const refereeAccount = await this.accountRepository.findOne({
      where: { userId: refereeUserId, accountType: 'referee' },
    });

    if (!refereeAccount) {
      throw new NotFoundException('Referee account not found');
    }

    // Calculate total amount based on business rules
    const totalAmount = this.calculateRefereePayment(baseAmount, bonusAmount, division);

    // Create transfer
    const transfer = await this.createTransfer({
      paymentId: `game_${gameId}`,
      destinationAccountId: refereeAccount.stripeAccountId,
      amount: totalAmount,
      currency: 'usd',
      description: `Game officiating payment - ${division} division`,
      metadata: {
        ...metadata,
        gameId,
        gameDate: gameDate.toISOString(),
        division,
        baseAmount,
        bonusAmount,
        paymentType: 'referee_game_payment',
      },
      idempotencyKey: `referee_${gameId}_${refereeUserId}_${Date.now()}`,
    });

    return transfer;
  }

  /**
   * Get account status and capabilities
   */
  async getAccountStatus(accountId: string): Promise<{
    account: ConnectedAccount;
    stripeAccount: Stripe.Account;
    requiresAction: boolean;
    nextActionUrl?: string;
  }> {
    const account = await this.accountRepository.findOne({
      where: { stripeAccountId: accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    try {
      const stripeAccount = await this.stripeService.getStripeInstance().accounts.retrieve(accountId);

      // Update local account status
      account.chargesEnabled = stripeAccount.charges_enabled;
      account.payoutsEnabled = stripeAccount.payouts_enabled;
      account.capabilities = stripeAccount.capabilities;
      
      if (stripeAccount.details_submitted && stripeAccount.charges_enabled && stripeAccount.payouts_enabled) {
        account.status = 'enabled';
      } else if (stripeAccount.requirements?.currently_due?.length > 0) {
        account.status = 'restricted';
      }

      await this.accountRepository.save(account);

      const requiresAction = !stripeAccount.details_submitted || 
        stripeAccount.requirements?.currently_due?.length > 0;

      return {
        account,
        stripeAccount,
        requiresAction,
        nextActionUrl: requiresAction ? await this.createAccountLink({
          accountId,
          refreshUrl: `${this.configService.get('FRONTEND_URL')}/connect/refresh`,
          returnUrl: `${this.configService.get('FRONTEND_URL')}/connect/success`,
          type: stripeAccount.details_submitted ? 'account_update' : 'account_onboarding',
        }).then(link => link.url) : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get account status for ${accountId}:`, error);
      throw new BadRequestException('Failed to retrieve account status');
    }
  }

  /**
   * List transfers for an account
   */
  async getAccountTransfers(userId: string, limit = 50, offset = 0): Promise<{
    transfers: Transfer[];
    total: number;
  }> {
    const account = await this.accountRepository.findOne({
      where: { userId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const [transfers, total] = await this.transferRepository.findAndCount({
      where: { destinationAccountId: account.stripeAccountId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { transfers, total };
  }

  /**
   * Handle Connect webhook events
   */
  async handleConnectWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'account.updated':
        await this.handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      
      case 'account.application.deauthorized':
        await this.handleAccountDeauthorized(event.data.object as Stripe.Application);
        break;
      
      case 'transfer.created':
        await this.handleTransferCreated(event.data.object as Stripe.Transfer);
        break;
      
      case 'transfer.updated':
        await this.handleTransferUpdated(event.data.object as Stripe.Transfer);
        break;
      
      case 'transfer.reversed':
        await this.handleTransferReversed(event.data.object as Stripe.Transfer);
        break;
      
      default:
        this.logger.warn(`Unhandled Connect webhook event: ${event.type}`);
    }
  }

  private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    const localAccount = await this.accountRepository.findOne({
      where: { stripeAccountId: account.id },
    });

    if (localAccount) {
      localAccount.chargesEnabled = account.charges_enabled;
      localAccount.payoutsEnabled = account.payouts_enabled;
      localAccount.capabilities = account.capabilities;
      
      if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
        localAccount.status = 'enabled';
      } else if (account.requirements?.currently_due?.length > 0) {
        localAccount.status = 'restricted';
      }

      await this.accountRepository.save(localAccount);

      this.eventEmitter.emit('payment.connect.account.updated', {
        account: localAccount,
        stripeAccount: account,
      });
    }
  }

  private async handleAccountDeauthorized(application: Stripe.Application): Promise<void> {
    // Mark account as disabled when deauthorized
    const account = await this.accountRepository.findOne({
      where: { stripeAccountId: application.id },
    });

    if (account) {
      account.status = 'disabled';
      await this.accountRepository.save(account);

      this.eventEmitter.emit('payment.connect.account.deauthorized', { account });
    }
  }

  private async handleTransferCreated(transfer: Stripe.Transfer): Promise<void> {
    const localTransfer = await this.transferRepository.findOne({
      where: { transferId: transfer.id },
    });

    if (localTransfer) {
      localTransfer.status = 'pending';
      await this.transferRepository.save(localTransfer);

      this.eventEmitter.emit('payment.transfer.created', {
        transfer: localTransfer,
        stripeTransfer: transfer,
      });
    }
  }

  private async handleTransferUpdated(transfer: Stripe.Transfer): Promise<void> {
    const localTransfer = await this.transferRepository.findOne({
      where: { transferId: transfer.id },
    });

    if (localTransfer) {
      // Update status based on transfer state
      if (transfer.amount_reversed > 0) {
        localTransfer.status = 'reversed';
      } else if (transfer.metadata?.status === 'failed') {
        localTransfer.status = 'failed';
      } else {
        localTransfer.status = 'paid';
      }
      
      await this.transferRepository.save(localTransfer);

      this.eventEmitter.emit('payment.transfer.updated', {
        transfer: localTransfer,
        stripeTransfer: transfer,
      });
    }
  }

  private async handleTransferReversed(transfer: Stripe.Transfer): Promise<void> {
    const localTransfer = await this.transferRepository.findOne({
      where: { transferId: transfer.id },
    });

    if (localTransfer) {
      localTransfer.status = 'reversed';
      await this.transferRepository.save(localTransfer);

      this.eventEmitter.emit('payment.transfer.reversed', {
        transfer: localTransfer,
        stripeTransfer: transfer,
      });
    }
  }

  private getDefaultMcc(accountType: string): string {
    // Merchant Category Codes for different account types
    const mccMap = {
      referee: '7941', // Sports and recreational camps
      league: '7941', // Sports and recreational camps
      venue: '7941', // Sports and recreational camps
    };
    return mccMap[accountType] || '7941';
  }

  private calculateRefereePayment(baseAmount: number, bonusAmount: number, division: string): number {
    // Business rules for referee payments based on division
    const divisionMultipliers = {
      'youth-6u': 1.0,
      'youth-8u': 1.0,
      'youth-10u': 1.1,
      'youth-12u': 1.2,
      'youth-14u': 1.3,
      'youth-16u': 1.4,
      'youth-18u': 1.5,
      'high-school': 1.6,
      'adult': 1.5,
    };

    const multiplier = divisionMultipliers[division] || 1.0;
    return (baseAmount * multiplier) + bonusAmount;
  }
}