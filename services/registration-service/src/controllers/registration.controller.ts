import { Request, Response } from 'express';
import Joi from 'joi';
import { RegistrationService } from '../services/registration.service';
import { CreateOrderDto, UpdateOrderDto, ApplyDiscountDto, SignWaiverDto } from '../dto/create-order.dto';
import { logger } from '../config/database';

// Validation schemas
const createOrderSchema = Joi.object({
  tenant_id: Joi.string().uuid().required(),
  season_id: Joi.string().uuid().required(),
  division_id: Joi.string().uuid().required(),
  registration_type: Joi.string().valid('TEAM', 'INDIVIDUAL').required(),
  team_id: Joi.string().uuid().when('registration_type', {
    is: 'TEAM',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  player_ids: Joi.array().items(Joi.string().uuid()).when('registration_type', {
    is: 'INDIVIDUAL',
    then: Joi.required().min(1),
    otherwise: Joi.optional()
  }),
  primary_contact: Joi.object({
    user_id: Joi.string().uuid().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
    first_name: Joi.string().min(2).max(50).required(),
    last_name: Joi.string().min(2).max(50).required(),
  }).required(),
  emergency_contacts: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    relationship: Joi.string().required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
    email: Joi.string().email().optional(),
  })).min(1).required(),
  medical_info: Joi.object({
    allergies: Joi.array().items(Joi.string()).optional(),
    medications: Joi.array().items(Joi.string()).optional(),
    conditions: Joi.array().items(Joi.string()).optional(),
    doctor_name: Joi.string().optional(),
    doctor_phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    insurance_provider: Joi.string().optional(),
    insurance_policy_number: Joi.string().optional(),
  }).optional(),
  payment_method: Joi.string().valid('CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'CASH', 'PAYMENT_PLAN').required(),
  metadata: Joi.object().optional(),
});

const updateOrderSchema = Joi.object({
  status: Joi.string().valid('DRAFT', 'PENDING_PAYMENT', 'PENDING_WAIVERS', 'COMPLETED', 'CANCELLED').optional(),
  primary_contact: Joi.object({
    user_id: Joi.string().uuid().optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    first_name: Joi.string().min(2).max(50).optional(),
    last_name: Joi.string().min(2).max(50).optional(),
  }).optional(),
  emergency_contacts: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    relationship: Joi.string().required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
    email: Joi.string().email().optional(),
  })).optional(),
  medical_info: Joi.object({
    allergies: Joi.array().items(Joi.string()).optional(),
    medications: Joi.array().items(Joi.string()).optional(),
    conditions: Joi.array().items(Joi.string()).optional(),
    doctor_name: Joi.string().optional(),
    doctor_phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    insurance_provider: Joi.string().optional(),
    insurance_policy_number: Joi.string().optional(),
  }).optional(),
  metadata: Joi.object().optional(),
});

const applyDiscountSchema = Joi.object({
  discount_code: Joi.string().min(3).max(50).required(),
});

const signWaiverSchema = Joi.object({
  waiver_type: Joi.string().valid('LIABILITY', 'MEDICAL', 'PHOTO_RELEASE', 'SAFESPORT').required(),
  player_id: Joi.string().uuid().required(),
  signed_by_user_id: Joi.string().uuid().required(),
  parent_consent_id: Joi.string().uuid().optional(),
  signature_data: Joi.string().required(),
  ip_address: Joi.string().ip().required(),
  user_agent: Joi.string().required(),
});

export class RegistrationController {
  private registrationService: RegistrationService;

  constructor() {
    this.registrationService = new RegistrationService();
  }

  /**
   * Create a new registration order
   */
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId || req.body.tenant_id;
      const userId = req.user?.id;

      // Validate request body
      const { error, value } = createOrderSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
        });
        return;
      }

      const orderData: CreateOrderDto = {
        ...value,
        created_by_user_id: userId,
        ip_address: req.ip,
      };

      // Create registration order
      const order = await this.registrationService.createOrder(tenantId, orderData);

      res.status(201).json({
        success: true,
        message: 'Registration order created successfully',
        data: order,
      });

    } catch (error) {
      logger.error('Create registration order error:', error);
      res.status(500).json({
        error: 'Registration Failed',
        message: error instanceof Error ? error.message : 'An error occurred during registration',
      });
    }
  }

  /**
   * Get registration order by ID
   */
  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { orderId } = req.params;

      if (!orderId) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Order ID is required',
        });
        return;
      }

      const order = await this.registrationService.getOrderById(tenantId, orderId);

      if (!order) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Registration order not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: order,
      });

    } catch (error) {
      logger.error('Get registration order error:', error);
      res.status(500).json({
        error: 'Retrieval Failed',
        message: 'An error occurred while retrieving the registration order',
      });
    }
  }

  /**
   * Update registration order
   */
  async updateOrder(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { orderId } = req.params;
      const userId = req.user?.id;

      if (!orderId) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Order ID is required',
        });
        return;
      }

      // Validate request body
      const { error, value } = updateOrderSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
        });
        return;
      }

      const updateData: UpdateOrderDto = {
        ...value,
        updated_by_user_id: userId,
      };

      const updatedOrder = await this.registrationService.updateOrder(tenantId, orderId, updateData);

      if (!updatedOrder) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Registration order not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Registration order updated successfully',
        data: updatedOrder,
      });

    } catch (error) {
      logger.error('Update registration order error:', error);
      res.status(500).json({
        error: 'Update Failed',
        message: error instanceof Error ? error.message : 'An error occurred while updating the registration order',
      });
    }
  }

  /**
   * Apply discount code to order
   */
  async applyDiscount(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { orderId } = req.params;
      const userId = req.user?.id;

      if (!orderId) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Order ID is required',
        });
        return;
      }

      // Validate request body
      const { error, value } = applyDiscountSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
        });
        return;
      }

      const discountData: ApplyDiscountDto = {
        ...value,
        applied_by_user_id: userId,
      };

      const result = await this.registrationService.applyDiscount(tenantId, orderId, discountData);

      res.status(200).json({
        success: true,
        message: 'Discount applied successfully',
        data: result,
      });

    } catch (error) {
      logger.error('Apply discount error:', error);
      res.status(500).json({
        error: 'Discount Application Failed',
        message: error instanceof Error ? error.message : 'An error occurred while applying the discount',
      });
    }
  }

  /**
   * Sign waiver for registration
   */
  async signWaiver(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { orderId } = req.params;

      if (!orderId) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Order ID is required',
        });
        return;
      }

      // Validate request body
      const { error, value } = signWaiverSchema.validate({
        ...req.body,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      });

      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
        });
        return;
      }

      const waiverData: SignWaiverDto = value;

      const waiver = await this.registrationService.signWaiver(tenantId, orderId, waiverData);

      res.status(200).json({
        success: true,
        message: 'Waiver signed successfully',
        data: waiver,
      });

    } catch (error) {
      logger.error('Sign waiver error:', error);
      res.status(500).json({
        error: 'Waiver Signing Failed',
        message: error instanceof Error ? error.message : 'An error occurred while signing the waiver',
      });
    }
  }

  /**
   * Get all waivers for an order
   */
  async getOrderWaivers(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { orderId } = req.params;

      if (!orderId) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Order ID is required',
        });
        return;
      }

      const waivers = await this.registrationService.getOrderWaivers(tenantId, orderId);

      res.status(200).json({
        success: true,
        data: waivers,
      });

    } catch (error) {
      logger.error('Get order waivers error:', error);
      res.status(500).json({
        error: 'Retrieval Failed',
        message: 'An error occurred while retrieving waivers',
      });
    }
  }

  /**
   * Get registration history for a user
   */
  async getUserRegistrations(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user?.id || req.params.userId;

      if (!userId) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'User ID is required',
        });
        return;
      }

      const registrations = await this.registrationService.getUserRegistrations(tenantId, userId);

      res.status(200).json({
        success: true,
        data: registrations,
      });

    } catch (error) {
      logger.error('Get user registrations error:', error);
      res.status(500).json({
        error: 'Retrieval Failed',
        message: 'An error occurred while retrieving user registrations',
      });
    }
  }

  /**
   * Get audit trail for an order
   */
  async getOrderAuditTrail(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { orderId } = req.params;

      if (!orderId) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Order ID is required',
        });
        return;
      }

      const auditTrail = await this.registrationService.getOrderAuditTrail(tenantId, orderId);

      res.status(200).json({
        success: true,
        data: auditTrail,
      });

    } catch (error) {
      logger.error('Get order audit trail error:', error);
      res.status(500).json({
        error: 'Retrieval Failed',
        message: 'An error occurred while retrieving audit trail',
      });
    }
  }

  /**
   * Cancel registration order
   */
  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { orderId } = req.params;
      const userId = req.user?.id;
      const { reason } = req.body;

      if (!orderId) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Order ID is required',
        });
        return;
      }

      const result = await this.registrationService.cancelOrder(tenantId, orderId, userId, reason);

      res.status(200).json({
        success: true,
        message: 'Registration order cancelled successfully',
        data: result,
      });

    } catch (error) {
      logger.error('Cancel order error:', error);
      res.status(500).json({
        error: 'Cancellation Failed',
        message: error instanceof Error ? error.message : 'An error occurred while cancelling the order',
      });
    }
  }

  /**
   * Check COPPA compliance for players
   */
  async checkCOPPACompliance(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { orderId } = req.params;

      if (!orderId) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Order ID is required',
        });
        return;
      }

      const compliance = await this.registrationService.checkCOPPACompliance(tenantId, orderId);

      res.status(200).json({
        success: true,
        data: compliance,
      });

    } catch (error) {
      logger.error('Check COPPA compliance error:', error);
      res.status(500).json({
        error: 'Compliance Check Failed',
        message: 'An error occurred while checking COPPA compliance',
      });
    }
  }
}