import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { TenantDatabase } from '../config/database';
import { 
  RegistrationOrder, 
  RegistrationPlayer, 
  RegistrationWaiver, 
  RegistrationAuditLog,
  CreateOrderDto,
  UpdateOrderDto
} from '../dto/create-order.dto';

export class RegistrationEntity {
  private static async getPool(tenantId: string): Promise<Pool> {
    return TenantDatabase.getConnection(tenantId);
  }

  /**
   * Create a new registration order
   */
  static async createOrder(tenantId: string, data: CreateOrderDto): Promise<RegistrationOrder> {
    const pool = await this.getPool(tenantId);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Generate order number
      const orderNumber = await this.generateOrderNumber(client, tenantId);

      // Calculate initial pricing (before discounts)
      const pricing = await this.calculatePricing(client, data);

      // Create the registration order
      const orderQuery = `
        INSERT INTO registration_orders (
          id, tenant_id, order_number, season_id, division_id,
          registration_type, team_id, status, primary_contact,
          emergency_contacts, medical_info, payment_method,
          subtotal, discount_amount, tax_amount, total_amount,
          metadata, created_by_user_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, NOW(), NOW()
        ) RETURNING *
      `;

      const orderId = uuidv4();
      const orderValues = [
        orderId,
        tenantId,
        orderNumber,
        data.season_id,
        data.division_id,
        data.registration_type,
        data.team_id || null,
        'DRAFT',
        JSON.stringify(data.primary_contact),
        JSON.stringify(data.emergency_contacts),
        JSON.stringify(data.medical_info || {}),
        data.payment_method,
        pricing.subtotal,
        0, // discount_amount (initially 0)
        pricing.tax_amount,
        pricing.total_amount,
        JSON.stringify(data.metadata || {}),
        data.created_by_user_id
      ];

      const orderResult = await client.query(orderQuery, orderValues);
      const order = this.mapRowToOrder(orderResult.rows[0]);

      // Create registration players if individual registration
      if (data.registration_type === 'INDIVIDUAL' && data.player_ids) {
        for (const playerId of data.player_ids) {
          await this.createRegistrationPlayer(client, orderId, playerId);
        }
      }

      // Create audit log entry
      await this.createAuditLog(client, orderId, 'ORDER_CREATED', data.created_by_user_id!, {
        order_number: orderNumber,
        registration_type: data.registration_type,
        ip_address: data.ip_address
      });

      await client.query('COMMIT');
      return order;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update a registration order
   */
  static async updateOrder(tenantId: string, orderId: string, data: UpdateOrderDto): Promise<RegistrationOrder | null> {
    const pool = await this.getPool(tenantId);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let valueIndex = 1;

      if (data.status) {
        updateFields.push(`status = $${valueIndex++}`);
        updateValues.push(data.status);

        if (data.status === 'COMPLETED') {
          updateFields.push(`completed_at = $${valueIndex++}`);
          updateValues.push(new Date());
        } else if (data.status === 'CANCELLED') {
          updateFields.push(`cancelled_at = $${valueIndex++}`);
          updateValues.push(new Date());
        }
      }

      if (data.primary_contact) {
        updateFields.push(`primary_contact = $${valueIndex++}`);
        updateValues.push(JSON.stringify(data.primary_contact));
      }

      if (data.emergency_contacts) {
        updateFields.push(`emergency_contacts = $${valueIndex++}`);
        updateValues.push(JSON.stringify(data.emergency_contacts));
      }

      if (data.medical_info) {
        updateFields.push(`medical_info = $${valueIndex++}`);
        updateValues.push(JSON.stringify(data.medical_info));
      }

      if (data.metadata) {
        updateFields.push(`metadata = $${valueIndex++}`);
        updateValues.push(JSON.stringify(data.metadata));
      }

      updateFields.push(`updated_at = $${valueIndex++}`);
      updateValues.push(new Date());

      // Add WHERE clause parameters
      updateValues.push(orderId);
      updateValues.push(tenantId);

      const updateQuery = `
        UPDATE registration_orders
        SET ${updateFields.join(', ')}
        WHERE id = $${valueIndex++} AND tenant_id = $${valueIndex}
        RETURNING *
      `;

      const result = await client.query(updateQuery, updateValues);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const order = this.mapRowToOrder(result.rows[0]);

      // Create audit log entry
      await this.createAuditLog(client, orderId, 'ORDER_UPDATED', data.updated_by_user_id!, {
        updated_fields: Object.keys(data),
        status_change: data.status
      });

      await client.query('COMMIT');
      return order;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a registration order by ID
   */
  static async findById(tenantId: string, orderId: string): Promise<RegistrationOrder | null> {
    const pool = await this.getPool(tenantId);
    
    const query = `
      SELECT * FROM registration_orders
      WHERE id = $1 AND tenant_id = $2
    `;

    const result = await pool.query(query, [orderId, tenantId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToOrder(result.rows[0]);
  }

  /**
   * Get registration orders by user
   */
  static async findByUser(tenantId: string, userId: string): Promise<RegistrationOrder[]> {
    const pool = await this.getPool(tenantId);
    
    const query = `
      SELECT * FROM registration_orders
      WHERE tenant_id = $1 
        AND (created_by_user_id = $2 OR primary_contact->>'user_id' = $2)
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [tenantId, userId]);

    return result.rows.map(row => this.mapRowToOrder(row));
  }

  /**
   * Create a registration player record
   */
  static async createRegistrationPlayer(client: any, orderId: string, playerId: string): Promise<RegistrationPlayer> {
    // First, get player details
    const playerQuery = `
      SELECT id, first_name, last_name, birth_date, 
             EXTRACT(YEAR FROM AGE(birth_date)) as age
      FROM users 
      WHERE id = $1
    `;

    const playerResult = await client.query(playerQuery, [playerId]);
    const player = playerResult.rows[0];

    const registrationPlayerId = uuidv4();
    const requiresCoppaConsent = player.age < 13;

    const insertQuery = `
      INSERT INTO registration_players (
        id, registration_order_id, player_id, player_first_name,
        player_last_name, player_birth_date, player_age,
        requires_coppa_consent, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW()
      ) RETURNING *
    `;

    const values = [
      registrationPlayerId,
      orderId,
      playerId,
      player.first_name,
      player.last_name,
      player.birth_date,
      player.age,
      requiresCoppaConsent
    ];

    const result = await client.query(insertQuery, values);
    return this.mapRowToPlayer(result.rows[0]);
  }

  /**
   * Create a waiver record
   */
  static async createWaiver(tenantId: string, orderId: string, waiverData: any): Promise<RegistrationWaiver> {
    const pool = await this.getPool(tenantId);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Generate document hash for integrity
      const documentHash = await this.generateDocumentHash(waiverData);

      const waiverId = uuidv4();
      const insertQuery = `
        INSERT INTO registration_waivers (
          id, registration_order_id, player_id, waiver_type,
          signed_by_user_id, signed_by_name, parent_consent_id,
          signature_data, signed_at, ip_address, user_agent,
          document_version, document_hash, is_valid
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11, $12, true
        ) RETURNING *
      `;

      // Get signer name
      const signerQuery = `SELECT first_name, last_name FROM users WHERE id = $1`;
      const signerResult = await client.query(signerQuery, [waiverData.signed_by_user_id]);
      const signer = signerResult.rows[0];
      const signerName = `${signer.first_name} ${signer.last_name}`;

      const values = [
        waiverId,
        orderId,
        waiverData.player_id,
        waiverData.waiver_type,
        waiverData.signed_by_user_id,
        signerName,
        waiverData.parent_consent_id || null,
        waiverData.signature_data,
        waiverData.ip_address,
        waiverData.user_agent,
        '1.0', // document version
        documentHash
      ];

      const result = await client.query(insertQuery, values);
      const waiver = this.mapRowToWaiver(result.rows[0]);

      // Create audit log entry
      await this.createAuditLog(client, orderId, 'WAIVER_SIGNED', waiverData.signed_by_user_id, {
        waiver_type: waiverData.waiver_type,
        player_id: waiverData.player_id,
        ip_address: waiverData.ip_address
      });

      // Check if all waivers are complete and update order status
      await this.checkAndUpdateWaiverStatus(client, orderId, tenantId);

      await client.query('COMMIT');
      return waiver;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get waivers for an order
   */
  static async getOrderWaivers(tenantId: string, orderId: string): Promise<RegistrationWaiver[]> {
    const pool = await this.getPool(tenantId);
    
    const query = `
      SELECT w.* FROM registration_waivers w
      JOIN registration_orders o ON w.registration_order_id = o.id
      WHERE w.registration_order_id = $1 AND o.tenant_id = $2
      ORDER BY w.signed_at DESC
    `;

    const result = await pool.query(query, [orderId, tenantId]);

    return result.rows.map(row => this.mapRowToWaiver(row));
  }

  /**
   * Create audit log entry
   */
  static async createAuditLog(
    client: any, 
    orderId: string, 
    action: string, 
    userId: string, 
    details: any
  ): Promise<void> {
    // Get user name
    const userQuery = `SELECT first_name, last_name FROM users WHERE id = $1`;
    const userResult = await client.query(userQuery, [userId]);
    const user = userResult.rows[0];
    const userName = user ? `${user.first_name} ${user.last_name}` : 'System';

    const insertQuery = `
      INSERT INTO registration_audit_logs (
        id, registration_order_id, action, performed_by_user_id,
        performed_by_name, action_timestamp, details
      ) VALUES (
        $1, $2, $3, $4, $5, NOW(), $6
      )
    `;

    const values = [
      uuidv4(),
      orderId,
      action,
      userId,
      userName,
      JSON.stringify(details)
    ];

    await client.query(insertQuery, values);
  }

  /**
   * Get audit trail for an order
   */
  static async getAuditTrail(tenantId: string, orderId: string): Promise<RegistrationAuditLog[]> {
    const pool = await this.getPool(tenantId);
    
    const query = `
      SELECT a.* FROM registration_audit_logs a
      JOIN registration_orders o ON a.registration_order_id = o.id
      WHERE a.registration_order_id = $1 AND o.tenant_id = $2
      ORDER BY a.action_timestamp DESC
    `;

    const result = await pool.query(query, [orderId, tenantId]);

    return result.rows.map(row => this.mapRowToAuditLog(row));
  }

  /**
   * Helper method to generate order number
   */
  private static async generateOrderNumber(client: any, tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const query = `
      SELECT COUNT(*) as count 
      FROM registration_orders 
      WHERE tenant_id = $1 AND EXTRACT(YEAR FROM created_at) = $2
    `;
    
    const result = await client.query(query, [tenantId, year]);
    const count = parseInt(result.rows[0].count) + 1;
    
    return `REG-${year}-${count.toString().padStart(6, '0')}`;
  }

  /**
   * Helper method to calculate pricing
   */
  private static async calculatePricing(client: any, data: CreateOrderDto): Promise<any> {
    // This would fetch pricing from division/season settings
    // For now, returning mock pricing
    const basePrice = data.registration_type === 'TEAM' ? 500.00 : 100.00;
    const playerCount = data.player_ids?.length || 1;
    const subtotal = basePrice * playerCount;
    const taxRate = 0.08; // 8% tax
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    return {
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount
    };
  }

  /**
   * Helper method to generate document hash
   */
  private static async generateDocumentHash(waiverData: any): Promise<string> {
    const crypto = require('crypto');
    const data = JSON.stringify({
      waiver_type: waiverData.waiver_type,
      player_id: waiverData.player_id,
      signed_by_user_id: waiverData.signed_by_user_id,
      signature_data: waiverData.signature_data,
      timestamp: new Date().toISOString()
    });
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Check and update waiver status
   */
  private static async checkAndUpdateWaiverStatus(client: any, orderId: string, tenantId: string): Promise<void> {
    // Check if all required waivers are signed
    const checkQuery = `
      SELECT 
        COUNT(DISTINCT rp.player_id) as total_players,
        COUNT(DISTINCT w.player_id) as signed_players
      FROM registration_players rp
      LEFT JOIN registration_waivers w ON w.registration_order_id = rp.registration_order_id 
        AND w.player_id = rp.player_id 
        AND w.waiver_type = 'LIABILITY'
      WHERE rp.registration_order_id = $1
    `;

    const result = await client.query(checkQuery, [orderId]);
    const { total_players, signed_players } = result.rows[0];

    if (total_players === signed_players && total_players > 0) {
      // All waivers signed, check current status
      const statusQuery = `
        SELECT status FROM registration_orders 
        WHERE id = $1 AND tenant_id = $2
      `;
      
      const statusResult = await client.query(statusQuery, [orderId, tenantId]);
      const currentStatus = statusResult.rows[0].status;

      // If currently pending waivers, move to next status
      if (currentStatus === 'PENDING_WAIVERS') {
        await client.query(
          'UPDATE registration_orders SET status = $1, updated_at = NOW() WHERE id = $2',
          ['COMPLETED', orderId]
        );
      }
    }
  }

  /**
   * Map database row to RegistrationOrder
   */
  private static mapRowToOrder(row: any): RegistrationOrder {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      order_number: row.order_number,
      season_id: row.season_id,
      division_id: row.division_id,
      registration_type: row.registration_type,
      team_id: row.team_id,
      status: row.status,
      primary_contact: row.primary_contact,
      emergency_contacts: row.emergency_contacts,
      medical_info: row.medical_info,
      payment_method: row.payment_method,
      subtotal: parseFloat(row.subtotal),
      discount_amount: parseFloat(row.discount_amount),
      tax_amount: parseFloat(row.tax_amount),
      total_amount: parseFloat(row.total_amount),
      discount_code: row.discount_code,
      discount_percentage: row.discount_percentage,
      metadata: row.metadata,
      created_by_user_id: row.created_by_user_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      completed_at: row.completed_at,
      cancelled_at: row.cancelled_at,
      cancellation_reason: row.cancellation_reason
    };
  }

  /**
   * Map database row to RegistrationPlayer
   */
  private static mapRowToPlayer(row: any): RegistrationPlayer {
    return {
      id: row.id,
      registration_order_id: row.registration_order_id,
      player_id: row.player_id,
      player_first_name: row.player_first_name,
      player_last_name: row.player_last_name,
      player_birth_date: row.player_birth_date,
      player_age: row.player_age,
      requires_coppa_consent: row.requires_coppa_consent,
      coppa_consent_id: row.coppa_consent_id,
      coppa_consent_status: row.coppa_consent_status,
      jersey_size: row.jersey_size,
      jersey_number_preference: row.jersey_number_preference,
      created_at: row.created_at
    };
  }

  /**
   * Map database row to RegistrationWaiver
   */
  private static mapRowToWaiver(row: any): RegistrationWaiver {
    return {
      id: row.id,
      registration_order_id: row.registration_order_id,
      player_id: row.player_id,
      waiver_type: row.waiver_type,
      signed_by_user_id: row.signed_by_user_id,
      signed_by_name: row.signed_by_name,
      parent_consent_id: row.parent_consent_id,
      signature_data: row.signature_data,
      signed_at: row.signed_at,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      document_version: row.document_version,
      document_hash: row.document_hash,
      is_valid: row.is_valid,
      expires_at: row.expires_at
    };
  }

  /**
   * Map database row to RegistrationAuditLog
   */
  private static mapRowToAuditLog(row: any): RegistrationAuditLog {
    return {
      id: row.id,
      registration_order_id: row.registration_order_id,
      action: row.action,
      performed_by_user_id: row.performed_by_user_id,
      performed_by_name: row.performed_by_name,
      action_timestamp: row.action_timestamp,
      details: row.details,
      ip_address: row.ip_address,
      user_agent: row.user_agent
    };
  }
}