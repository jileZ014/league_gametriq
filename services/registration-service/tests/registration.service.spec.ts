import { RegistrationService } from '../src/services/registration.service';
import { RegistrationEntity } from '../src/models/registration.entity';
import { COPPAService } from '../src/services/coppa.service';
import { 
  CreateOrderDto, 
  UpdateOrderDto, 
  ApplyDiscountDto, 
  SignWaiverDto,
  RegistrationOrder
} from '../src/dto/create-order.dto';

// Mock dependencies
jest.mock('../src/models/registration.entity');
jest.mock('../src/services/coppa.service');
jest.mock('../src/config/database', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('RegistrationService', () => {
  let registrationService: RegistrationService;
  let mockRegistrationEntity: jest.Mocked<typeof RegistrationEntity>;
  let mockCOPPAService: jest.Mocked<COPPAService>;

  beforeEach(() => {
    jest.clearAllMocks();
    registrationService = new RegistrationService();
    mockRegistrationEntity = RegistrationEntity as jest.Mocked<typeof RegistrationEntity>;
    mockCOPPAService = (registrationService as any).coppaService as jest.Mocked<COPPAService>;
  });

  describe('createOrder', () => {
    const tenantId = 'tenant123';
    const mockOrderData: CreateOrderDto = {
      tenant_id: tenantId,
      season_id: 'season123',
      division_id: 'division123',
      registration_type: 'INDIVIDUAL',
      player_ids: ['player123'],
      primary_contact: {
        user_id: 'user123',
        email: 'test@example.com',
        phone: '+1234567890',
        first_name: 'John',
        last_name: 'Doe'
      },
      emergency_contacts: [{
        name: 'Jane Doe',
        relationship: 'Mother',
        phone: '+1234567891'
      }],
      payment_method: 'CREDIT_CARD',
      created_by_user_id: 'user123'
    };

    const mockOrder: RegistrationOrder = {
      id: 'order123',
      tenant_id: tenantId,
      order_number: 'REG-2024-000001',
      season_id: 'season123',
      division_id: 'division123',
      registration_type: 'INDIVIDUAL',
      status: 'DRAFT',
      primary_contact: mockOrderData.primary_contact,
      emergency_contacts: mockOrderData.emergency_contacts,
      payment_method: 'CREDIT_CARD',
      subtotal: 100,
      discount_amount: 0,
      tax_amount: 8,
      total_amount: 108,
      metadata: {},
      created_by_user_id: 'user123',
      created_at: new Date(),
      updated_at: new Date()
    };

    it('should create an order successfully', async () => {
      mockRegistrationEntity.createOrder.mockResolvedValue(mockOrder);
      mockCOPPAService.checkParentalConsent.mockResolvedValue({
        hasValidConsent: true,
        permissions: {
          registration: true,
          teamParticipation: true,
          photoVideo: false,
          communication: true,
          marketing: false
        }
      });

      const result = await registrationService.createOrder(tenantId, mockOrderData);

      expect(result).toEqual(mockOrder);
      expect(mockRegistrationEntity.createOrder).toHaveBeenCalledWith(tenantId, mockOrderData);
    });

    it('should throw error when tenant ID is missing', async () => {
      await expect(registrationService.createOrder('', mockOrderData))
        .rejects.toThrow('Tenant ID is required');
    });

    it('should throw error for team registration without team ID', async () => {
      const teamOrderData = { ...mockOrderData, registration_type: 'TEAM' as const, team_id: undefined };

      await expect(registrationService.createOrder(tenantId, teamOrderData))
        .rejects.toThrow('Team ID is required for team registrations');
    });

    it('should throw error for individual registration without player IDs', async () => {
      const individualOrderData = { ...mockOrderData, player_ids: [] };

      await expect(registrationService.createOrder(tenantId, individualOrderData))
        .rejects.toThrow('At least one player ID is required for individual registrations');
    });

    it('should update order status when COPPA consent is required', async () => {
      mockRegistrationEntity.createOrder.mockResolvedValue(mockOrder);
      mockCOPPAService.checkParentalConsent.mockResolvedValue({
        hasValidConsent: false
      });
      mockRegistrationEntity.updateOrder.mockResolvedValue({ ...mockOrder, status: 'PENDING_WAIVERS' });

      const result = await registrationService.createOrder(tenantId, mockOrderData);

      expect(mockRegistrationEntity.updateOrder).toHaveBeenCalled();
    });
  });

  describe('getOrderById', () => {
    const tenantId = 'tenant123';
    const orderId = 'order123';

    it('should return order when found', async () => {
      const mockOrder = { id: orderId } as RegistrationOrder;
      mockRegistrationEntity.findById.mockResolvedValue(mockOrder);

      const result = await registrationService.getOrderById(tenantId, orderId);

      expect(result).toEqual(mockOrder);
      expect(mockRegistrationEntity.findById).toHaveBeenCalledWith(tenantId, orderId);
    });

    it('should return null when order not found', async () => {
      mockRegistrationEntity.findById.mockResolvedValue(null);

      const result = await registrationService.getOrderById(tenantId, orderId);

      expect(result).toBeNull();
    });
  });

  describe('updateOrder', () => {
    const tenantId = 'tenant123';
    const orderId = 'order123';
    const updateData: UpdateOrderDto = {
      status: 'PENDING_PAYMENT',
      updated_by_user_id: 'user123'
    };

    it('should update order successfully', async () => {
      const existingOrder = { id: orderId, status: 'DRAFT' } as RegistrationOrder;
      const updatedOrder = { ...existingOrder, status: 'PENDING_PAYMENT' } as RegistrationOrder;

      mockRegistrationEntity.findById.mockResolvedValue(existingOrder);
      mockRegistrationEntity.updateOrder.mockResolvedValue(updatedOrder);

      const result = await registrationService.updateOrder(tenantId, orderId, updateData);

      expect(result).toEqual(updatedOrder);
      expect(mockRegistrationEntity.updateOrder).toHaveBeenCalledWith(tenantId, orderId, updateData);
    });

    it('should return null when order not found', async () => {
      mockRegistrationEntity.findById.mockResolvedValue(null);

      const result = await registrationService.updateOrder(tenantId, orderId, updateData);

      expect(result).toBeNull();
      expect(mockRegistrationEntity.updateOrder).not.toHaveBeenCalled();
    });

    it('should throw error for invalid status transition', async () => {
      const existingOrder = { id: orderId, status: 'COMPLETED' } as RegistrationOrder;
      mockRegistrationEntity.findById.mockResolvedValue(existingOrder);

      await expect(registrationService.updateOrder(tenantId, orderId, updateData))
        .rejects.toThrow('Invalid status transition from COMPLETED to PENDING_PAYMENT');
    });
  });

  describe('applyDiscount', () => {
    const tenantId = 'tenant123';
    const orderId = 'order123';
    const discountData: ApplyDiscountDto = {
      discount_code: 'SAVE10',
      applied_by_user_id: 'user123'
    };

    it('should apply discount successfully', async () => {
      const mockOrder = {
        id: orderId,
        subtotal: 100,
        tax_amount: 8,
        total_amount: 108,
        metadata: {}
      } as RegistrationOrder;

      mockRegistrationEntity.findById.mockResolvedValue(mockOrder);
      mockRegistrationEntity.updateOrder.mockResolvedValue({
        ...mockOrder,
        metadata: { discount_code: 'SAVE10', discount_amount: 10 }
      });

      const result = await registrationService.applyDiscount(tenantId, orderId, discountData);

      expect(result).toBeDefined();
      expect(mockRegistrationEntity.updateOrder).toHaveBeenCalled();
    });

    it('should throw error when order not found', async () => {
      mockRegistrationEntity.findById.mockResolvedValue(null);

      await expect(registrationService.applyDiscount(tenantId, orderId, discountData))
        .rejects.toThrow('Registration order not found');
    });
  });

  describe('signWaiver', () => {
    const tenantId = 'tenant123';
    const orderId = 'order123';
    const waiverData: SignWaiverDto = {
      waiver_type: 'LIABILITY',
      player_id: 'player123',
      signed_by_user_id: 'user123',
      signature_data: 'base64signature',
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0'
    };

    it('should sign waiver successfully', async () => {
      const mockOrder = { id: orderId } as RegistrationOrder;
      const mockWaiver = {
        id: 'waiver123',
        registration_order_id: orderId,
        player_id: 'player123',
        waiver_type: 'LIABILITY',
        signed_at: new Date()
      };

      mockRegistrationEntity.findById.mockResolvedValue(mockOrder);
      mockRegistrationEntity.getOrderWaivers.mockResolvedValue([]);
      mockRegistrationEntity.createWaiver.mockResolvedValue(mockWaiver as any);

      const result = await registrationService.signWaiver(tenantId, orderId, waiverData);

      expect(result).toEqual(mockWaiver);
      expect(mockRegistrationEntity.createWaiver).toHaveBeenCalledWith(tenantId, orderId, waiverData);
    });

    it('should throw error when order not found', async () => {
      mockRegistrationEntity.findById.mockResolvedValue(null);

      await expect(registrationService.signWaiver(tenantId, orderId, waiverData))
        .rejects.toThrow('Registration order not found');
    });

    it('should throw error for duplicate waiver', async () => {
      const mockOrder = { id: orderId } as RegistrationOrder;
      const existingWaiver = {
        player_id: 'player123',
        waiver_type: 'LIABILITY',
        is_valid: true
      };

      mockRegistrationEntity.findById.mockResolvedValue(mockOrder);
      mockRegistrationEntity.getOrderWaivers.mockResolvedValue([existingWaiver as any]);

      await expect(registrationService.signWaiver(tenantId, orderId, waiverData))
        .rejects.toThrow('Waiver already signed for this player and type');
    });
  });

  describe('cancelOrder', () => {
    const tenantId = 'tenant123';
    const orderId = 'order123';
    const userId = 'user123';
    const reason = 'Changed mind';

    it('should cancel order successfully', async () => {
      const mockOrder = {
        id: orderId,
        status: 'DRAFT',
        metadata: {}
      } as RegistrationOrder;

      const cancelledOrder = {
        ...mockOrder,
        status: 'CANCELLED',
        metadata: { cancellation_reason: reason }
      } as RegistrationOrder;

      mockRegistrationEntity.findById.mockResolvedValue(mockOrder);
      mockRegistrationEntity.updateOrder.mockResolvedValue(cancelledOrder);

      const result = await registrationService.cancelOrder(tenantId, orderId, userId, reason);

      expect(result).toEqual(cancelledOrder);
      expect(mockRegistrationEntity.updateOrder).toHaveBeenCalled();
    });

    it('should throw error when order not found', async () => {
      mockRegistrationEntity.findById.mockResolvedValue(null);

      await expect(registrationService.cancelOrder(tenantId, orderId, userId, reason))
        .rejects.toThrow('Registration order not found');
    });

    it('should throw error when order already cancelled', async () => {
      const mockOrder = { id: orderId, status: 'CANCELLED' } as RegistrationOrder;
      mockRegistrationEntity.findById.mockResolvedValue(mockOrder);

      await expect(registrationService.cancelOrder(tenantId, orderId, userId, reason))
        .rejects.toThrow('Order is already cancelled');
    });

    it('should throw error when trying to cancel completed order', async () => {
      const mockOrder = { id: orderId, status: 'COMPLETED' } as RegistrationOrder;
      mockRegistrationEntity.findById.mockResolvedValue(mockOrder);

      await expect(registrationService.cancelOrder(tenantId, orderId, userId, reason))
        .rejects.toThrow('Cannot cancel completed orders');
    });
  });

  describe('checkCOPPACompliance', () => {
    const tenantId = 'tenant123';
    const orderId = 'order123';

    it('should check COPPA compliance successfully', async () => {
      const mockOrder = { id: orderId } as RegistrationOrder;
      const mockPlayers = [
        {
          player_id: 'player123',
          player_first_name: 'John',
          player_last_name: 'Doe',
          player_age: 12
        }
      ];

      mockRegistrationEntity.findById.mockResolvedValue(mockOrder);
      (registrationService as any).getOrderPlayers = jest.fn().mockResolvedValue(mockPlayers);
      mockCOPPAService.checkParentalConsent.mockResolvedValue({
        hasValidConsent: false,
        consentId: undefined,
        parentEmail: undefined
      });

      const result = await registrationService.checkCOPPACompliance(tenantId, orderId);

      expect(result).toBeDefined();
      expect(result.all_players_compliant).toBe(false);
      expect(result.players_requiring_consent).toHaveLength(1);
      expect(result.pending_consents).toBe(1);
    });

    it('should throw error when order not found', async () => {
      mockRegistrationEntity.findById.mockResolvedValue(null);

      await expect(registrationService.checkCOPPACompliance(tenantId, orderId))
        .rejects.toThrow('Registration order not found');
    });
  });

  describe('getUserRegistrations', () => {
    const tenantId = 'tenant123';
    const userId = 'user123';

    it('should get user registrations successfully', async () => {
      const mockRegistrations = [
        { id: 'order1' },
        { id: 'order2' }
      ] as RegistrationOrder[];

      mockRegistrationEntity.findByUser.mockResolvedValue(mockRegistrations);

      const result = await registrationService.getUserRegistrations(tenantId, userId);

      expect(result).toEqual(mockRegistrations);
      expect(mockRegistrationEntity.findByUser).toHaveBeenCalledWith(tenantId, userId);
    });
  });

  describe('getOrderAuditTrail', () => {
    const tenantId = 'tenant123';
    const orderId = 'order123';

    it('should get audit trail successfully', async () => {
      const mockAuditTrail = [
        {
          id: 'audit1',
          action: 'ORDER_CREATED',
          action_timestamp: new Date()
        }
      ];

      mockRegistrationEntity.getAuditTrail.mockResolvedValue(mockAuditTrail as any);

      const result = await registrationService.getOrderAuditTrail(tenantId, orderId);

      expect(result).toEqual(mockAuditTrail);
      expect(mockRegistrationEntity.getAuditTrail).toHaveBeenCalledWith(tenantId, orderId);
    });
  });
});