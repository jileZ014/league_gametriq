import { RegistrationEntity } from '../models/registration.entity';
import { COPPAService } from './coppa.service';
import { 
  CreateOrderDto, 
  UpdateOrderDto, 
  ApplyDiscountDto, 
  SignWaiverDto,
  RegistrationOrder,
  RegistrationWaiver,
  RegistrationAuditLog,
  DiscountValidation,
  COPPAComplianceCheck,
  RegistrationPlayer
} from '../dto/create-order.dto';
import { logger } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class RegistrationService {
  private coppaService: COPPAService;

  constructor() {
    this.coppaService = new COPPAService();
  }

  /**
   * Create a new registration order
   */
  async createOrder(tenantId: string, orderData: CreateOrderDto): Promise<RegistrationOrder> {
    try {
      // Validate tenant
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      // Validate registration type requirements
      if (orderData.registration_type === 'TEAM' && !orderData.team_id) {
        throw new Error('Team ID is required for team registrations');
      }

      if (orderData.registration_type === 'INDIVIDUAL' && (!orderData.player_ids || orderData.player_ids.length === 0)) {
        throw new Error('At least one player ID is required for individual registrations');
      }

      // Check for duplicate registrations
      await this.checkForDuplicateRegistrations(tenantId, orderData);

      // Create the order
      const order = await RegistrationEntity.createOrder(tenantId, orderData);

      // If individual registration, check COPPA compliance
      if (orderData.registration_type === 'INDIVIDUAL' && orderData.player_ids) {
        const coppaCheck = await this.checkPlayersForCOPPA(tenantId, order.id, orderData.player_ids);
        
        if (coppaCheck.players_requiring_consent.length > 0) {
          // Update order status to pending waivers
          await RegistrationEntity.updateOrder(tenantId, order.id, {
            status: 'PENDING_WAIVERS',
            metadata: {
              ...order.metadata,
              coppa_check: coppaCheck
            }
          });
        }
      }

      logger.info('Registration order created', {
        tenant_id: tenantId,
        order_id: order.id,
        order_number: order.order_number,
        registration_type: order.registration_type
      });

      return order;

    } catch (error) {
      logger.error('Failed to create registration order', {
        tenant_id: tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get registration order by ID
   */
  async getOrderById(tenantId: string, orderId: string): Promise<RegistrationOrder | null> {
    try {
      const order = await RegistrationEntity.findById(tenantId, orderId);
      
      if (!order) {
        logger.warn('Registration order not found', {
          tenant_id: tenantId,
          order_id: orderId
        });
        return null;
      }

      return order;

    } catch (error) {
      logger.error('Failed to get registration order', {
        tenant_id: tenantId,
        order_id: orderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Update registration order
   */
  async updateOrder(tenantId: string, orderId: string, updateData: UpdateOrderDto): Promise<RegistrationOrder | null> {
    try {
      // Get existing order
      const existingOrder = await RegistrationEntity.findById(tenantId, orderId);
      
      if (!existingOrder) {
        return null;
      }

      // Validate status transitions
      if (updateData.status) {
        this.validateStatusTransition(existingOrder.status, updateData.status);
      }

      // Update the order
      const updatedOrder = await RegistrationEntity.updateOrder(tenantId, orderId, updateData);

      logger.info('Registration order updated', {
        tenant_id: tenantId,
        order_id: orderId,
        updated_fields: Object.keys(updateData)
      });

      return updatedOrder;

    } catch (error) {
      logger.error('Failed to update registration order', {
        tenant_id: tenantId,
        order_id: orderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Apply discount code to order
   */
  async applyDiscount(tenantId: string, orderId: string, discountData: ApplyDiscountDto): Promise<RegistrationOrder> {
    try {
      // Get existing order
      const order = await RegistrationEntity.findById(tenantId, orderId);
      
      if (!order) {
        throw new Error('Registration order not found');
      }

      // Validate discount code
      const discountValidation = await this.validateDiscountCode(tenantId, discountData.discount_code, order);
      
      if (!discountValidation.is_valid) {
        throw new Error(discountValidation.error_message || 'Invalid discount code');
      }

      // Calculate new totals with discount
      const newTotals = this.calculateDiscountedTotals(order, discountValidation);

      // Update order with discount
      const updatedOrder = await RegistrationEntity.updateOrder(tenantId, orderId, {
        metadata: {
          ...order.metadata,
          discount_code: discountValidation.discount_code,
          discount_type: discountValidation.discount_type,
          discount_value: discountValidation.discount_value,
          discount_amount: discountValidation.discount_amount,
          discount_applied_at: new Date(),
          discount_applied_by: discountData.applied_by_user_id
        }
      });

      // Create audit log for discount application
      await RegistrationEntity.createAuditLog(
        null as any, // Will need to refactor to accept pool
        orderId,
        'DISCOUNT_APPLIED',
        discountData.applied_by_user_id!,
        {
          discount_code: discountValidation.discount_code,
          discount_amount: discountValidation.discount_amount,
          original_total: order.total_amount,
          new_total: newTotals.total_amount
        }
      );

      logger.info('Discount applied to registration order', {
        tenant_id: tenantId,
        order_id: orderId,
        discount_code: discountValidation.discount_code,
        discount_amount: discountValidation.discount_amount
      });

      return updatedOrder!;

    } catch (error) {
      logger.error('Failed to apply discount', {
        tenant_id: tenantId,
        order_id: orderId,
        discount_code: discountData.discount_code,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Sign waiver for registration
   */
  async signWaiver(tenantId: string, orderId: string, waiverData: SignWaiverDto): Promise<RegistrationWaiver> {
    try {
      // Get existing order
      const order = await RegistrationEntity.findById(tenantId, orderId);
      
      if (!order) {
        throw new Error('Registration order not found');
      }

      // Validate player belongs to order
      await this.validatePlayerInOrder(tenantId, orderId, waiverData.player_id);

      // Check if player requires parental consent
      const playerAge = await this.getPlayerAge(tenantId, waiverData.player_id);
      
      if (playerAge < 13 && !waiverData.parent_consent_id) {
        throw new Error('Parental consent required for players under 13');
      }

      // Check for duplicate waiver
      const existingWaivers = await RegistrationEntity.getOrderWaivers(tenantId, orderId);
      const duplicateWaiver = existingWaivers.find(w => 
        w.player_id === waiverData.player_id && 
        w.waiver_type === waiverData.waiver_type &&
        w.is_valid
      );

      if (duplicateWaiver) {
        throw new Error('Waiver already signed for this player and type');
      }

      // Create waiver record
      const waiver = await RegistrationEntity.createWaiver(tenantId, orderId, waiverData);

      logger.info('Waiver signed for registration', {
        tenant_id: tenantId,
        order_id: orderId,
        waiver_id: waiver.id,
        waiver_type: waiver.waiver_type,
        player_id: waiver.player_id
      });

      return waiver;

    } catch (error) {
      logger.error('Failed to sign waiver', {
        tenant_id: tenantId,
        order_id: orderId,
        waiver_type: waiverData.waiver_type,
        player_id: waiverData.player_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get all waivers for an order
   */
  async getOrderWaivers(tenantId: string, orderId: string): Promise<RegistrationWaiver[]> {
    try {
      const waivers = await RegistrationEntity.getOrderWaivers(tenantId, orderId);
      return waivers;

    } catch (error) {
      logger.error('Failed to get order waivers', {
        tenant_id: tenantId,
        order_id: orderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get registration history for a user
   */
  async getUserRegistrations(tenantId: string, userId: string): Promise<RegistrationOrder[]> {
    try {
      const registrations = await RegistrationEntity.findByUser(tenantId, userId);
      
      logger.info('Retrieved user registrations', {
        tenant_id: tenantId,
        user_id: userId,
        registration_count: registrations.length
      });

      return registrations;

    } catch (error) {
      logger.error('Failed to get user registrations', {
        tenant_id: tenantId,
        user_id: userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get audit trail for an order
   */
  async getOrderAuditTrail(tenantId: string, orderId: string): Promise<RegistrationAuditLog[]> {
    try {
      const auditTrail = await RegistrationEntity.getAuditTrail(tenantId, orderId);
      
      logger.info('Retrieved order audit trail', {
        tenant_id: tenantId,
        order_id: orderId,
        audit_count: auditTrail.length
      });

      return auditTrail;

    } catch (error) {
      logger.error('Failed to get order audit trail', {
        tenant_id: tenantId,
        order_id: orderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Cancel registration order
   */
  async cancelOrder(tenantId: string, orderId: string, userId: string, reason?: string): Promise<RegistrationOrder> {
    try {
      // Get existing order
      const order = await RegistrationEntity.findById(tenantId, orderId);
      
      if (!order) {
        throw new Error('Registration order not found');
      }

      // Validate cancellation is allowed
      if (order.status === 'CANCELLED') {
        throw new Error('Order is already cancelled');
      }

      if (order.status === 'COMPLETED') {
        throw new Error('Cannot cancel completed orders');
      }

      // Update order status
      const updatedOrder = await RegistrationEntity.updateOrder(tenantId, orderId, {
        status: 'CANCELLED',
        metadata: {
          ...order.metadata,
          cancellation_reason: reason,
          cancelled_by: userId,
          cancelled_at: new Date()
        }
      });

      logger.info('Registration order cancelled', {
        tenant_id: tenantId,
        order_id: orderId,
        cancelled_by: userId,
        reason: reason
      });

      return updatedOrder!;

    } catch (error) {
      logger.error('Failed to cancel order', {
        tenant_id: tenantId,
        order_id: orderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Check COPPA compliance for order
   */
  async checkCOPPACompliance(tenantId: string, orderId: string): Promise<COPPAComplianceCheck> {
    try {
      const order = await RegistrationEntity.findById(tenantId, orderId);
      
      if (!order) {
        throw new Error('Registration order not found');
      }

      // Get all players in the order
      const players = await this.getOrderPlayers(tenantId, orderId);
      
      // Check each player's COPPA status
      const playersRequiringConsent = [];
      let compliantPlayers = 0;

      for (const player of players) {
        if (player.player_age < 13) {
          const consentStatus = await this.coppaService.checkParentalConsent(
            tenantId, 
            player.player_id
          );

          if (consentStatus.hasValidConsent) {
            compliantPlayers++;
          }

          playersRequiringConsent.push({
            player_id: player.player_id,
            player_name: `${player.player_first_name} ${player.player_last_name}`,
            age: player.player_age,
            consent_status: consentStatus.hasValidConsent ? 'APPROVED' : 'PENDING',
            consent_id: consentStatus.consentId,
            parent_email: consentStatus.parentEmail
          });
        } else {
          compliantPlayers++;
        }
      }

      const complianceCheck: COPPAComplianceCheck = {
        order_id: orderId,
        all_players_compliant: compliantPlayers === players.length,
        players_requiring_consent: playersRequiringConsent,
        total_players: players.length,
        compliant_players: compliantPlayers,
        pending_consents: playersRequiringConsent.filter(p => p.consent_status === 'PENDING').length
      };

      logger.info('COPPA compliance check completed', {
        tenant_id: tenantId,
        order_id: orderId,
        all_players_compliant: complianceCheck.all_players_compliant,
        pending_consents: complianceCheck.pending_consents
      });

      return complianceCheck;

    } catch (error) {
      logger.error('Failed to check COPPA compliance', {
        tenant_id: tenantId,
        order_id: orderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async checkForDuplicateRegistrations(tenantId: string, orderData: CreateOrderDto): Promise<void> {
    // Check if players are already registered for the season/division
    // This would query existing registrations
    // Implementation depends on business rules
  }

  private async checkPlayersForCOPPA(tenantId: string, orderId: string, playerIds: string[]): Promise<any> {
    const playersRequiringConsent = [];
    
    for (const playerId of playerIds) {
      const age = await this.getPlayerAge(tenantId, playerId);
      if (age < 13) {
        const consentStatus = await this.coppaService.checkParentalConsent(tenantId, playerId);
        if (!consentStatus.hasValidConsent) {
          playersRequiringConsent.push({
            player_id: playerId,
            age: age,
            consent_status: 'PENDING'
          });
        }
      }
    }

    return {
      players_requiring_consent: playersRequiringConsent
    };
  }

  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      'DRAFT': ['PENDING_PAYMENT', 'PENDING_WAIVERS', 'CANCELLED'],
      'PENDING_PAYMENT': ['PENDING_WAIVERS', 'COMPLETED', 'CANCELLED'],
      'PENDING_WAIVERS': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [],
      'CANCELLED': []
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  private async validateDiscountCode(
    tenantId: string, 
    discountCode: string, 
    order: RegistrationOrder
  ): Promise<DiscountValidation> {
    // This would validate against a discounts table
    // For now, returning mock validation
    return {
      is_valid: true,
      discount_code: discountCode,
      discount_type: 'PERCENTAGE',
      discount_value: 10,
      discount_amount: order.subtotal * 0.10,
      applicable_to: 'ORDER',
      valid_from: new Date('2024-01-01'),
      valid_until: new Date('2024-12-31')
    };
  }

  private calculateDiscountedTotals(order: RegistrationOrder, discount: DiscountValidation): any {
    const discountAmount = discount.discount_amount;
    const newSubtotal = order.subtotal - discountAmount;
    const newTaxAmount = newSubtotal * (order.tax_amount / order.subtotal);
    const newTotalAmount = newSubtotal + newTaxAmount;

    return {
      subtotal: newSubtotal,
      discount_amount: discountAmount,
      tax_amount: newTaxAmount,
      total_amount: newTotalAmount
    };
  }

  private async validatePlayerInOrder(tenantId: string, orderId: string, playerId: string): Promise<void> {
    // This would check if the player is part of the registration order
    // Implementation depends on the entity relationships
  }

  private async getPlayerAge(tenantId: string, playerId: string): Promise<number> {
    // This would fetch player age from the users table
    // For now, returning a mock age
    return 14;
  }

  private async getOrderPlayers(tenantId: string, orderId: string): Promise<RegistrationPlayer[]> {
    // This would fetch all players associated with the order
    // For now, returning empty array
    return [];
  }
}