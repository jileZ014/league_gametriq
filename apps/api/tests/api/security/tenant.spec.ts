import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { TenantGuardMiddleware } from '../../../src/middleware/tenant_guard';

describe('Tenant Isolation Security Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;

  // Test data
  const tenant1Id = '11111111-1111-1111-1111-111111111111';
  const tenant2Id = '22222222-2222-2222-2222-222222222222';
  
  const user1 = {
    id: 'user-1111-1111-1111-111111111111',
    email: 'user1@tenant1.com',
    organizationId: tenant1Id,
    roles: ['user'],
  };

  const user2 = {
    id: 'user-2222-2222-2222-222222222222',
    email: 'user2@tenant2.com',
    organizationId: tenant2Id,
    roles: ['user'],
  };

  const superAdmin = {
    id: 'admin-0000-0000-0000-000000000000',
    email: 'superadmin@system.com',
    organizationId: tenant1Id,
    roles: ['admin'],
    isSuperAdmin: true,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      // Add your app module and necessary providers
      providers: [
        {
          provide: DataSource,
          useValue: {
            query: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockImplementation((payload) => `mock-jwt-${payload.id}`),
            verify: jest.fn().mockImplementation((token) => {
              const id = token.replace('mock-jwt-', '');
              if (id === user1.id) return user1;
              if (id === user2.id) return user2;
              if (id === superAdmin.id) return superAdmin;
              throw new Error('Invalid token');
            }),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply tenant guard middleware
    app.use(new TenantGuardMiddleware(dataSource).use);
    
    await app.init();
    
    dataSource = moduleFixture.get<DataSource>(DataSource);
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Cross-Tenant Access Prevention', () => {
    it('should prevent user from accessing another tenant\'s payment data', async () => {
      const paymentId = 'payment-1111-1111-1111-111111111111';
      
      // Mock database query to return payment belonging to tenant1
      (dataSource.query as jest.Mock).mockResolvedValueOnce([
        { organization_id: tenant1Id },
      ]);

      const token = jwtService.sign({ id: user2.id });

      const response = await request(app.getHttpServer())
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.FORBIDDEN);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('access denied');
    });

    it('should allow user to access their own tenant\'s payment data', async () => {
      const paymentId = 'payment-1111-1111-1111-111111111111';
      
      // Mock database query to return payment belonging to tenant1
      (dataSource.query as jest.Mock).mockResolvedValueOnce([
        { organization_id: tenant1Id },
      ]);

      const token = jwtService.sign({ id: user1.id });

      await request(app.getHttpServer())
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);
    });

    it('should prevent access to another tenant\'s branding configuration', async () => {
      const brandingId = 'branding-2222-2222-2222-222222222222';
      
      // Mock database query to return branding belonging to tenant2
      (dataSource.query as jest.Mock).mockResolvedValueOnce([
        { organization_id: tenant2Id },
      ]);

      const token = jwtService.sign({ id: user1.id });

      await request(app.getHttpServer())
        .get(`/api/branding/${brandingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should prevent listing resources from another tenant via query parameter', async () => {
      const token = jwtService.sign({ id: user1.id });

      await request(app.getHttpServer())
        .get('/api/payments')
        .query({ organizationId: tenant2Id })
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should prevent creating resources in another tenant', async () => {
      const token = jwtService.sign({ id: user1.id });

      const paymentData = {
        amount: 100,
        organizationId: tenant2Id, // Attempting to create in tenant2
      };

      await request(app.getHttpServer())
        .post('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .send(paymentData)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should prevent updating resources in another tenant', async () => {
      const paymentId = 'payment-2222-2222-2222-222222222222';
      
      // Mock database query to return payment belonging to tenant2
      (dataSource.query as jest.Mock).mockResolvedValueOnce([
        { organization_id: tenant2Id },
      ]);

      const token = jwtService.sign({ id: user1.id });

      await request(app.getHttpServer())
        .patch(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 200 })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should prevent deleting resources in another tenant', async () => {
      const paymentId = 'payment-2222-2222-2222-222222222222';
      
      // Mock database query to return payment belonging to tenant2
      (dataSource.query as jest.Mock).mockResolvedValueOnce([
        { organization_id: tenant2Id },
      ]);

      const token = jwtService.sign({ id: user1.id });

      await request(app.getHttpServer())
        .delete(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('Super Admin Access', () => {
    it('should allow super admin to access any tenant\'s data', async () => {
      const paymentId = 'payment-2222-2222-2222-222222222222';
      
      // Mock database query to return payment belonging to tenant2
      (dataSource.query as jest.Mock).mockResolvedValueOnce([
        { organization_id: tenant2Id },
      ]);

      const token = jwtService.sign({ id: superAdmin.id });

      await request(app.getHttpServer())
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);
    });

    it('should allow super admin to list all tenants\' data', async () => {
      const token = jwtService.sign({ id: superAdmin.id });

      await request(app.getHttpServer())
        .get('/api/payments')
        .query({ organizationId: tenant2Id })
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);
    });
  });

  describe('Tenant Context Extraction', () => {
    it('should extract tenant ID from route parameter', async () => {
      const token = jwtService.sign({ id: user1.id });

      await request(app.getHttpServer())
        .get(`/api/organizations/${tenant1Id}/settings`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);
    });

    it('should fall back to user\'s organization when no explicit tenant provided', async () => {
      const token = jwtService.sign({ id: user1.id });

      await request(app.getHttpServer())
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);
    });

    it('should reject requests without tenant context', async () => {
      const userWithoutOrg = {
        id: 'user-no-org',
        email: 'noorg@example.com',
      };

      const token = jwtService.sign({ id: userWithoutOrg.id });

      await request(app.getHttpServer())
        .get('/api/payments')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('Audit Log Creation', () => {
    it('should log cross-tenant access attempts', async () => {
      const paymentId = 'payment-2222-2222-2222-222222222222';
      
      // Mock database query to return payment belonging to tenant2
      (dataSource.query as jest.Mock).mockResolvedValueOnce([
        { organization_id: tenant2Id },
      ]);

      const token = jwtService.sign({ id: user1.id });

      await request(app.getHttpServer())
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.FORBIDDEN);

      // Verify audit log was created
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('security_audit_log'),
        expect.any(Array),
      );
    });
  });

  describe('Performance Tests', () => {
    it('should add minimal overhead to requests', async () => {
      const token = jwtService.sign({ id: user1.id });
      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        
        await request(app.getHttpServer())
          .get('/api/health')
          .set('Authorization', `Bearer ${token}`);
        
        times.push(Date.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      
      // Average request time should be under 50ms
      expect(avgTime).toBeLessThan(50);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should sanitize tenant ID in queries', async () => {
      const maliciousTenantId = "'; DROP TABLE payments; --";
      const token = jwtService.sign({ id: user1.id });

      await request(app.getHttpServer())
        .get('/api/payments')
        .query({ organizationId: maliciousTenantId })
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.FORBIDDEN);

      // Verify no dangerous SQL was executed
      expect(dataSource.query).not.toHaveBeenCalledWith(
        expect.stringContaining('DROP TABLE'),
        expect.any(Array),
      );
    });
  });

  describe('Concurrent Access Tests', () => {
    it('should handle concurrent requests from different tenants', async () => {
      const token1 = jwtService.sign({ id: user1.id });
      const token2 = jwtService.sign({ id: user2.id });

      const requests = [
        request(app.getHttpServer())
          .get('/api/payments')
          .set('Authorization', `Bearer ${token1}`),
        request(app.getHttpServer())
          .get('/api/payments')
          .set('Authorization', `Bearer ${token2}`),
      ];

      const responses = await Promise.all(requests);

      // Both requests should succeed with their respective tenant data
      responses.forEach(response => {
        expect(response.status).toBe(HttpStatus.OK);
      });
    });
  });
});