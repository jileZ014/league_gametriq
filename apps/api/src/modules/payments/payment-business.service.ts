import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentsService } from './payments.service';
import { SubscriptionService } from './subscription.service';
import { StripeConnectService } from './stripe-connect.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Import actual entities
import { RegistrationFee } from './entities/registration-fee.entity';
import { DiscountCode } from './entities/discount-code.entity';
import { RegistrationOrder } from './entities/registration-order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderDiscount } from './entities/order-discount.entity';

@Injectable()
export class PaymentBusinessService {
  private readonly logger = new Logger(PaymentBusinessService.name);

  constructor(
    @InjectRepository(RegistrationFee)
    private feeRepository: Repository<RegistrationFee>,
    @InjectRepository(DiscountCode)
    private discountRepository: Repository<DiscountCode>,
    @InjectRepository(RegistrationOrder)
    private orderRepository: Repository<RegistrationOrder>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OrderDiscount)
    private orderDiscountRepository: Repository<OrderDiscount>,
    private paymentsService: PaymentsService,
    private subscriptionService: SubscriptionService,
    private stripeConnectService: StripeConnectService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Calculate registration fees with business rules applied
   */
  async calculateRegistrationFees(params: {
    leagueId: string;
    division: string;
    registrationDate: Date;
    numberOfTeams: number;
    discountCode?: string;
  }): Promise<{
    baseAmount: number;
    discounts: Array<{ type: string; description: string; amount: number }>;
    fees: Array<{ type: string; description: string; amount: number }>;
    subtotal: number;
    totalDiscount: number;
    totalFees: number;
    total: number;
    currency: string;
  }> {
    const { leagueId, division, registrationDate, numberOfTeams, discountCode } = params;

    // Get registration fee structure
    const feeStructure = await this.feeRepository.findOne({
      where: { leagueId, division },
    });

    if (!feeStructure) {
      throw new BadRequestException(`No fee structure found for league ${leagueId}, division ${division}`);
    }

    const baseAmount = feeStructure.baseAmount * numberOfTeams;
    const discounts: Array<{ type: string; description: string; amount: number }> = [];
    const fees: Array<{ type: string; description: string; amount: number }> = [];

    // Apply early bird discount
    if (registrationDate <= feeStructure.earlyBirdDeadline) {
      const discountAmount = baseAmount * (feeStructure.earlyBirdDiscount / 100);
      discounts.push({
        type: 'early_bird',
        description: `Early bird discount (${feeStructure.earlyBirdDiscount}%)`,
        amount: discountAmount,
      });
    }

    // Apply late registration fee
    if (registrationDate > feeStructure.lateRegistrationDate) {
      fees.push({
        type: 'late_registration',
        description: 'Late registration fee',
        amount: feeStructure.lateRegistrationFee,
      });
    }

    // Apply multi-team discount
    if (numberOfTeams >= 2) {
      const discountAmount = baseAmount * (feeStructure.multiTeamDiscount / 100);
      discounts.push({
        type: 'multi_team',
        description: `Multiple team discount (${feeStructure.multiTeamDiscount}% for ${numberOfTeams} teams)`,
        amount: discountAmount,
      });
    }

    // Apply discount code if provided
    if (discountCode) {
      const discount = await this.validateAndApplyDiscountCode(discountCode, baseAmount, 'team_registration');
      if (discount) {
        discounts.push({
          type: 'discount_code',
          description: `Discount code: ${discountCode}`,
          amount: discount.amount,
        });
      }
    }

    const subtotal = baseAmount;
    const totalDiscount = discounts.reduce((sum, d) => sum + d.amount, 0);
    const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
    const total = Math.max(0, subtotal - totalDiscount + totalFees);

    return {
      baseAmount,
      discounts,
      fees,
      subtotal,
      totalDiscount,
      totalFees,
      total,
      currency: feeStructure.currency,
    };
  }

  /**
   * Create registration order with calculated fees
   */
  async createRegistrationOrder(params: {
    userId: string;
    leagueId: string;
    division: string;
    numberOfTeams: number;
    teamNames: string[];
    discountCode?: string;
    metadata?: Record<string, any>;
  }): Promise<RegistrationOrder> {
    const { userId, leagueId, division, numberOfTeams, teamNames, discountCode, metadata } = params;

    const registrationDate = new Date();
    
    // Calculate fees
    const calculation = await this.calculateRegistrationFees({
      leagueId,
      division,
      registrationDate,
      numberOfTeams,
      discountCode,
    });

    // Create order
    const order = await this.orderRepository.save({
      userId,
      leagueId,
      orderType: 'team_registration',
      items: [],
      subtotal: calculation.subtotal,
      discounts: [],
      totalDiscount: calculation.totalDiscount,
      taxes: 0, // TODO: Implement tax calculation based on location
      total: calculation.total,
      currency: calculation.currency,
      status: 'draft',
      metadata: {
        ...metadata,
        division,
        numberOfTeams,
        teamNames,
        registrationDate: registrationDate.toISOString(),
      },
    });

    // Create order items
    const orderItems = [];
    for (let i = 0; i < numberOfTeams; i++) {
      const item = await this.orderItemRepository.save({
        orderId: order.id,
        type: 'registration_fee',
        description: `Team registration - ${teamNames[i] || `Team ${i + 1}`}`,
        amount: calculation.baseAmount / numberOfTeams,
        quantity: 1,
        metadata: {
          teamName: teamNames[i] || `Team ${i + 1}`,
          division,
        },
      });
      orderItems.push(item);
    }

    // Add late fees if applicable
    for (const fee of calculation.fees) {
      const item = await this.orderItemRepository.save({
        orderId: order.id,
        type: 'late_fee',
        description: fee.description,
        amount: fee.amount,
        quantity: 1,
        metadata: { feeType: fee.type },
      });
      orderItems.push(item);
    }

    // Create discount records
    const orderDiscounts = [];
    for (const discount of calculation.discounts) {
      const discountRecord = await this.orderDiscountRepository.save({
        orderId: order.id,
        discountCodeId: discount.type === 'discount_code' ? await this.getDiscountCodeId(discountCode) : undefined,
        type: discount.type as any,
        description: discount.description,
        amount: discount.amount,
        metadata: { discountType: discount.type },
      });
      orderDiscounts.push(discountRecord);
    }

    // Update order with items and discounts
    order.items = orderItems;
    order.discounts = orderDiscounts;
    await this.orderRepository.save(order);

    this.logger.log(`Registration order created: ${order.id} for user ${userId}`);

    // Emit event
    this.eventEmitter.emit('payment.order.created', {
      order,
      calculation,
    });

    return order;
  }

  /**
   * Process payment for registration order
   */
  async processRegistrationPayment(params: {
    orderId: string;
    userId: string;
    paymentMethodId?: string;
    savePaymentMethod?: boolean;
    idempotencyKey: string;
  }): Promise<{ paymentIntent: any; order: RegistrationOrder }> {
    const { orderId, userId, paymentMethodId, savePaymentMethod, idempotencyKey } = params;

    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
      relations: ['items', 'discounts'],
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.status !== 'draft') {
      throw new BadRequestException('Order is not in draft status');
    }

    try {
      // Create payment intent
      const paymentIntent = await this.paymentsService.createPaymentIntent({
        orderId,
        amount: order.total,
        currency: order.currency,
        description: `Team registration payment - League ${order.leagueId}`,
        metadata: {
          orderType: order.orderType,
          leagueId: order.leagueId,
          numberOfTeams: order.metadata.numberOfTeams,
          division: order.metadata.division,
        },
        paymentMethodId,
        userId,
        idempotencyKey,
      });

      // Update order status
      order.status = 'pending_payment';
      order.paymentIntentId = paymentIntent.id;
      await this.orderRepository.save(order);

      // Mark discount codes as used if applicable
      for (const discount of order.discounts) {
        if (discount.discountCodeId) {
          await this.markDiscountCodeUsed(discount.discountCodeId);
        }
      }

      this.logger.log(`Payment intent created for order ${orderId}: ${paymentIntent.id}`);

      return { paymentIntent, order };
    } catch (error) {
      this.logger.error(`Failed to process payment for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Process tournament entry fee
   */
  async processTournamentPayment(params: {
    userId: string;
    tournamentId: string;
    teamId: string;
    entryFee: number;
    currency: string;
    paymentMethodId?: string;
    idempotencyKey: string;
  }): Promise<{ paymentIntent: any; order: RegistrationOrder }> {
    const { userId, tournamentId, teamId, entryFee, currency, paymentMethodId, idempotencyKey } = params;

    // Create tournament order
    const order = await this.orderRepository.save({
      userId,
      leagueId: tournamentId, // Using leagueId field for tournament
      orderType: 'tournament_entry',
      items: [],
      subtotal: entryFee,
      discounts: [],
      totalDiscount: 0,
      taxes: 0,
      total: entryFee,
      currency,
      status: 'draft',
      metadata: {
        tournamentId,
        teamId,
        entryDate: new Date().toISOString(),
      },
    });

    // Create order item
    const item = await this.orderItemRepository.save({
      orderId: order.id,
      type: 'tournament_fee',
      description: `Tournament entry fee - Tournament ${tournamentId}`,
      amount: entryFee,
      quantity: 1,
      metadata: {
        tournamentId,
        teamId,
      },
    });

    order.items = [item];

    // Process payment
    const paymentIntent = await this.paymentsService.createPaymentIntent({
      orderId: order.id,
      amount: entryFee,
      currency,
      description: `Tournament entry fee - Tournament ${tournamentId}`,
      metadata: {
        orderType: 'tournament_entry',
        tournamentId,
        teamId,
      },
      paymentMethodId,
      userId,
      idempotencyKey,
    });

    // Update order
    order.status = 'pending_payment';
    order.paymentIntentId = paymentIntent.id;
    await this.orderRepository.save(order);

    return { paymentIntent, order };
  }

  /**
   * Process referee payment for game
   */
  async processRefereePayment(params: {
    gameId: string;
    refereeUserId: string;
    leagueId: string;
    division: string;
    gameDate: Date;
    baseAmount?: number;
    bonusAmount?: number;
  }): Promise<any> {
    const { gameId, refereeUserId, leagueId, division, gameDate, baseAmount, bonusAmount } = params;

    // Get default referee payment rates if not provided
    const calculatedBaseAmount = baseAmount || this.getDefaultRefereeRate(division);
    const calculatedBonusAmount = bonusAmount || 0;

    // Process payment through Stripe Connect
    const transfer = await this.stripeConnectService.processRefereePayment({
      gameId,
      refereeUserId,
      baseAmount: calculatedBaseAmount,
      bonusAmount: calculatedBonusAmount,
      gameDate,
      division,
      metadata: {
        leagueId,
        paymentType: 'game_officiating',
      },
    });

    this.logger.log(`Referee payment processed: ${transfer.id} for game ${gameId}`);

    return transfer;
  }

  /**
   * Create and apply discount code
   */
  async createDiscountCode(params: {
    code: string;
    type: 'percentage' | 'fixed_amount';
    value: number;
    currency?: string;
    maxUses?: number;
    validFrom: Date;
    validUntil: Date;
    applicableItems: string[];
    minimumAmount?: number;
    metadata?: Record<string, any>;
  }): Promise<DiscountCode> {
    const {
      code,
      type,
      value,
      currency,
      maxUses,
      validFrom,
      validUntil,
      applicableItems,
      minimumAmount,
      metadata,
    } = params;

    // Check if code already exists
    const existingCode = await this.discountRepository.findOne({
      where: { code: code.toUpperCase() },
    });

    if (existingCode) {
      throw new BadRequestException('Discount code already exists');
    }

    const discountCode = await this.discountRepository.save({
      code: code.toUpperCase(),
      type,
      value,
      currency: currency || 'usd',
      maxUses,
      usedCount: 0,
      validFrom,
      validUntil,
      applicableItems,
      minimumAmount,
      active: true,
      metadata: metadata || {},
    });

    this.logger.log(`Discount code created: ${code}`);

    return discountCode;
  }

  /**
   * Get order history for user
   */
  async getUserOrderHistory(userId: string, limit = 50, offset = 0): Promise<{
    orders: RegistrationOrder[];
    total: number;
  }> {
    const [orders, total] = await this.orderRepository.findAndCount({
      where: { userId },
      relations: ['items', 'discounts'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { orders, total };
  }

  /**
   * Process refund for order
   */
  async processOrderRefund(params: {
    orderId: string;
    userId: string;
    amount?: number;
    reason: string;
    idempotencyKey: string;
  }): Promise<any> {
    const { orderId, userId, amount, reason, idempotencyKey } = params;

    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (!order.paymentIntentId) {
      throw new BadRequestException('No payment to refund');
    }

    // Check refund eligibility based on business rules
    const refundEligibility = this.checkRefundEligibility(order);
    if (!refundEligibility.eligible) {
      throw new BadRequestException(refundEligibility.reason);
    }

    // Process refund
    const refund = await this.paymentsService.processRefund({
      paymentIntentId: order.paymentIntentId,
      amount: amount || order.total,
      reason: 'requested_by_customer',
      description: reason,
      userId,
      idempotencyKey,
    });

    // Update order status
    if (!amount || amount >= order.total) {
      order.status = 'refunded';
      await this.orderRepository.save(order);
    }

    return refund;
  }

  private async validateAndApplyDiscountCode(
    code: string,
    orderAmount: number,
    orderType: string,
  ): Promise<{ amount: number } | null> {
    const discountCode = await this.discountRepository.findOne({
      where: { code: code.toUpperCase(), active: true },
    });

    if (!discountCode) {
      return null;
    }

    const now = new Date();
    if (now < discountCode.validFrom || now > discountCode.validUntil) {
      return null;
    }

    if (discountCode.maxUses && discountCode.usedCount >= discountCode.maxUses) {
      return null;
    }

    if (!discountCode.applicableItems.includes(orderType)) {
      return null;
    }

    if (discountCode.minimumAmount && orderAmount < discountCode.minimumAmount) {
      return null;
    }

    let discountAmount = 0;
    if (discountCode.type === 'percentage') {
      discountAmount = orderAmount * (discountCode.value / 100);
    } else {
      discountAmount = discountCode.value;
    }

    return { amount: Math.min(discountAmount, orderAmount) };
  }

  private async getDiscountCodeId(code: string): Promise<string | undefined> {
    if (!code) return undefined;
    
    const discountCode = await this.discountRepository.findOne({
      where: { code: code.toUpperCase() },
    });
    
    return discountCode?.id;
  }

  private async markDiscountCodeUsed(discountCodeId: string): Promise<void> {
    const discountCode = await this.discountRepository.findOne({
      where: { id: discountCodeId },
    });

    if (discountCode) {
      discountCode.usedCount += 1;
      await this.discountRepository.save(discountCode);
    }
  }

  private getDefaultRefereeRate(division: string): number {
    // Default referee rates based on division
    const rates = {
      'youth-6u': 40,
      'youth-8u': 40,
      'youth-10u': 45,
      'youth-12u': 50,
      'youth-14u': 55,
      'youth-16u': 60,
      'youth-18u': 65,
      'high-school': 70,
      'adult': 65,
    };

    return rates[division] || 50;
  }

  private checkRefundEligibility(order: RegistrationOrder): { eligible: boolean; reason?: string } {
    const now = new Date();
    const orderDate = new Date(order.createdAt);
    const daysSinceOrder = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

    // Business rule: Full refund within 7 days
    if (daysSinceOrder <= 7) {
      return { eligible: true };
    }

    // Business rule: No refund after season starts (example logic)
    const seasonStartDate = new Date(order.metadata.seasonStartDate);
    if (seasonStartDate && now >= seasonStartDate) {
      return {
        eligible: false,
        reason: 'Refunds are not available after the season has started',
      };
    }

    // Business rule: Partial refund available up to 30 days before season
    const daysUntilSeason = Math.floor((seasonStartDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilSeason < 30) {
      return {
        eligible: false,
        reason: 'Refunds are only available 30+ days before season start',
      };
    }

    return { eligible: true };
  }
}