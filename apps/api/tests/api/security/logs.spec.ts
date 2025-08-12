import { Test, TestingModule } from '@nestjs/testing';
import { LogScrubberMiddleware } from '../../../src/middleware/log_scrubber';
import { hashIpAddress, extractIpFromRequest, clearIpHashCache } from '../../../src/utils/ip_hash';
import { Request, Response } from 'express';

describe('PII Log Scrubbing', () => {
  let middleware: LogScrubberMiddleware;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new LogScrubberMiddleware();
    mockNext = jest.fn();
    
    mockReq = {
      body: {},
      query: {},
      headers: {},
      ip: '192.168.1.1',
    };

    mockRes = {
      send: jest.fn(),
      json: jest.fn(),
      on: jest.fn(),
    };

    // Clear IP hash cache before each test
    clearIpHashCache();
  });

  describe('LogScrubberMiddleware', () => {
    it('should redact email addresses in request body', () => {
      mockReq.body = {
        email: 'user@example.com',
        name: 'John Doe',
        guardian_email: 'parent@example.com',
      };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.email).toBe('[REDACTED]');
      expect(mockReq.body.guardian_email).toBe('[REDACTED]');
      expect(mockReq.body.name).toBe('John Doe');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should redact phone numbers', () => {
      mockReq.body = {
        phone: '+1-555-123-4567',
        mobile: '555-987-6543',
        work_phone: '(555) 111-2222',
      };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.phone).toBe('[REDACTED]');
      expect(mockReq.body.mobile).toBe('555-987-6543'); // 'mobile' not in PII list
      expect(mockReq.body.work_phone).toBe('(555) 111-2222'); // 'work_phone' not in PII list
    });

    it('should hash IP addresses instead of redacting them', () => {
      mockReq.body = {
        ip: '192.168.1.100',
        ipAddress: '10.0.0.1',
        ip_address: '172.16.0.1',
      };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.ip).not.toBe('[REDACTED]');
      expect(mockReq.body.ip).not.toBe('192.168.1.100');
      expect(mockReq.body.ip).toMatch(/^[a-f0-9]{16}$/); // Should be a 16-char hex hash
      
      expect(mockReq.body.ipAddress).not.toBe('10.0.0.1');
      expect(mockReq.body.ipAddress).toMatch(/^[a-f0-9]{16}$/);
      
      expect(mockReq.body.ip_address).not.toBe('172.16.0.1');
      expect(mockReq.body.ip_address).toMatch(/^[a-f0-9]{16}$/);
    });

    it('should redact authentication tokens', () => {
      mockReq.body = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        auth: 'Bearer abc123',
        access_token: 'secret-token',
        refresh_token: 'refresh-secret',
        api_key: 'sk_live_12345',
      };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.token).toBe('[REDACTED]');
      expect(mockReq.body.auth).toBe('[REDACTED]');
      expect(mockReq.body.access_token).toBe('[REDACTED]');
      expect(mockReq.body.refresh_token).toBe('[REDACTED]');
      expect(mockReq.body.api_key).toBe('[REDACTED]');
    });

    it('should redact payment information', () => {
      mockReq.body = {
        payment_method: 'pm_12345',
        payment_token: 'tok_visa',
        card_number: '4111111111111111',
        card_cvc: '123',
        card_holder: 'John Doe',
        stripe_customer: 'cus_12345',
        payment_id: 'pi_12345',
      };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.payment_method).toBe('[REDACTED]');
      expect(mockReq.body.payment_token).toBe('[REDACTED]');
      expect(mockReq.body.card_number).toBe('[REDACTED]');
      expect(mockReq.body.card_cvc).toBe('[REDACTED]');
      expect(mockReq.body.card_holder).toBe('[REDACTED]');
      expect(mockReq.body.stripe_customer).toBe('[REDACTED]');
      expect(mockReq.body.payment_id).toBe('[REDACTED]');
    });

    it('should handle nested objects', () => {
      mockReq.body = {
        user: {
          email: 'user@example.com',
          profile: {
            phone: '555-123-4567',
            address: {
              street: '123 Main St',
              ip: '192.168.1.1',
            },
          },
        },
        metadata: {
          payment_method: 'card',
          transaction_id: '12345',
        },
      };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.user.email).toBe('[REDACTED]');
      expect(mockReq.body.user.profile.phone).toBe('[REDACTED]');
      expect(mockReq.body.user.profile.address.street).toBe('123 Main St');
      expect(mockReq.body.user.profile.address.ip).toMatch(/^[a-f0-9]{16}$/);
      expect(mockReq.body.metadata.payment_method).toBe('[REDACTED]');
      expect(mockReq.body.metadata.transaction_id).toBe('12345');
    });

    it('should handle arrays', () => {
      mockReq.body = {
        users: [
          { email: 'user1@example.com', name: 'User 1' },
          { email: 'user2@example.com', name: 'User 2' },
        ],
        tokens: ['token1', 'token2', 'token3'],
      };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.users[0].email).toBe('[REDACTED]');
      expect(mockReq.body.users[1].email).toBe('[REDACTED]');
      expect(mockReq.body.users[0].name).toBe('User 1');
      expect(mockReq.body.users[1].name).toBe('User 2');
      expect(mockReq.body.tokens).toEqual(['token1', 'token2', 'token3']); // 'tokens' array not redacted, only 'token' field
    });

    it('should redact headers', () => {
      mockReq.headers = {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        'x-api-key': 'sk_live_12345',
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        'x-real-ip': '172.16.0.1',
        'content-type': 'application/json',
      };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.headers.authorization).toBe('[REDACTED]');
      expect(mockReq.headers['x-api-key']).toBe('[REDACTED]');
      expect(mockReq.headers['x-forwarded-for']).toMatch(/^[a-f0-9]{16}, [a-f0-9]{16}$/);
      expect(mockReq.headers['x-real-ip']).toMatch(/^[a-f0-9]{16}$/);
      expect(mockReq.headers['content-type']).toBe('application/json');
    });

    it('should have performance under 5ms', async () => {
      // Create a large nested object
      const largeBody = {
        users: Array(100).fill(null).map((_, i) => ({
          id: i,
          email: `user${i}@example.com`,
          phone: '555-123-4567',
          profile: {
            dob: '1990-01-01',
            ssn: '123-45-6789',
            payment_method: 'card',
            ip: '192.168.1.' + i,
          },
        })),
      };

      mockReq.body = largeBody;

      const startTime = process.hrtime.bigint();
      middleware.use(mockReq as Request, mockRes as Response, mockNext);
      const endTime = process.hrtime.bigint();

      const durationMs = Number(endTime - startTime) / 1000000;
      
      expect(durationMs).toBeLessThan(5);
      expect(mockReq.body.users[0].email).toBe('[REDACTED]');
      expect(mockReq.body.users[99].email).toBe('[REDACTED]');
    });

    it('should handle circular references gracefully', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      circular.email = 'test@example.com';

      mockReq.body = circular;

      // Should not throw an error
      expect(() => {
        middleware.use(mockReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();
    });

    it('should handle null and undefined values', () => {
      mockReq.body = {
        email: null,
        phone: undefined,
        data: {
          token: null,
          auth: undefined,
        },
      };

      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.email).toBeNull();
      expect(mockReq.body.phone).toBeUndefined();
      expect(mockReq.body.data.token).toBeNull();
      expect(mockReq.body.data.auth).toBeUndefined();
    });
  });

  describe('IP Hashing Utility', () => {
    it('should hash IP addresses consistently', () => {
      const ip = '192.168.1.1';
      const hash1 = hashIpAddress(ip);
      const hash2 = hashIpAddress(ip);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{16}$/);
    });

    it('should handle invalid IPs', () => {
      expect(hashIpAddress(null)).toBe('unknown');
      expect(hashIpAddress(undefined)).toBe('unknown');
      expect(hashIpAddress('')).toBe('unknown');
      expect(hashIpAddress('unknown')).toBe('unknown');
    });

    it('should produce different hashes for different IPs', () => {
      const hash1 = hashIpAddress('192.168.1.1');
      const hash2 = hashIpAddress('192.168.1.2');

      expect(hash1).not.toBe(hash2);
    });

    it('should extract IP from request headers', () => {
      const req1 = {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      };
      expect(extractIpFromRequest(req1)).toBe('192.168.1.1');

      const req2 = {
        headers: { 'x-real-ip': '172.16.0.1' },
      };
      expect(extractIpFromRequest(req2)).toBe('172.16.0.1');

      const req3 = {
        ip: '10.0.0.1',
      };
      expect(extractIpFromRequest(req3)).toBe('10.0.0.1');

      const req4 = {};
      expect(extractIpFromRequest(req4)).toBe('unknown');
    });

    it('should use environment pepper if available', () => {
      const originalPepper = process.env.IP_HASH_PEPPER;
      
      // Set custom pepper
      process.env.IP_HASH_PEPPER = 'test-pepper';
      clearIpHashCache();
      
      const hash1 = hashIpAddress('192.168.1.1');
      
      // Change pepper
      process.env.IP_HASH_PEPPER = 'different-pepper';
      clearIpHashCache();
      
      const hash2 = hashIpAddress('192.168.1.1');
      
      expect(hash1).not.toBe(hash2);
      
      // Restore original
      if (originalPepper) {
        process.env.IP_HASH_PEPPER = originalPepper;
      } else {
        delete process.env.IP_HASH_PEPPER;
      }
    });
  });

  describe('String scrubbing in logs', () => {
    let originalConsoleLog: typeof console.log;
    let logOutput: any[] = [];

    beforeEach(() => {
      originalConsoleLog = console.log;
      logOutput = [];
      console.log = jest.fn((...args) => {
        logOutput.push(...args);
      });
    });

    afterEach(() => {
      console.log = originalConsoleLog;
    });

    it('should scrub PII from string logs', () => {
      middleware.use(mockReq as Request, mockRes as Response, mockNext);

      console.log('User email is user@example.com');
      console.log('Phone: 555-123-4567');
      console.log('SSN: 123-45-6789');
      console.log('Card: 4111-1111-1111-1111');

      expect(logOutput[0]).toContain('[EMAIL_REDACTED]');
      expect(logOutput[1]).toContain('[PHONE_REDACTED]');
      expect(logOutput[2]).toContain('[SSN_REDACTED]');
      expect(logOutput[3]).toContain('[CARD_REDACTED]');
    });
  });
});