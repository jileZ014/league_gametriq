import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RegistrationService } from '../../../src/modules/users/registration.service';
import { PaymentsService } from '../../../src/modules/payments/payments.service';
import { User, UserStatus } from '../../../src/modules/users/entities/user.entity';
import { ParentalConsent, ConsentStatus } from '../../../src/modules/users/entities/parental-consent.entity';
import { AuditService } from '../../../src/modules/audit/audit.service';
import { hashIpAddress } from '../../../src/utils/ip_hash';
import * as bcrypt from 'bcrypt';

describe('COPPA Compliance Tests', () => {
  let registrationService: RegistrationService;
  let paymentsService: PaymentsService;
  let userRepository: Repository<User>;
  let consentRepository: Repository<ParentalConsent>;
  let auditService: AuditService;

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockConsentRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(ParentalConsent),
          useValue: mockConsentRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    registrationService = module.get<RegistrationService>(RegistrationService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    consentRepository = module.get<Repository<ParentalConsent>>(getRepositoryToken(ParentalConsent));
    auditService = module.get<AuditService>(AuditService);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Registration Service - COPPA Compliance', () => {
    describe('Minor Registration (Under 13)', () => {
      it('should store only birth year for minors', async () => {
        const minorData = {
          email: 'child@example.com',
          password: 'Test123!',
          firstName: 'Child',
          lastName: 'User',
          dateOfBirth: '2012-06-15', // 12 years old
          parentEmail: 'parent@example.com',
          organizationId: 'org-123',
        };

        mockUserRepository.findOne.mockResolvedValue(null);
        mockUserRepository.create.mockImplementation((data) => ({
          ...data,
          id: 'user-123',
        }));
        mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));
        mockConsentRepository.create.mockImplementation((data) => ({
          ...data,
          id: 'consent-123',
        }));
        mockConsentRepository.save.mockImplementation((consent) => Promise.resolve(consent));

        const result = await registrationService.register(minorData, '192.168.1.1');

        // Verify only birth year is stored
        expect(mockUserRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            birthYear: 2012,
            dateOfBirth: null,
            isMinor: true,
            parentEmail: 'parent@example.com',
            status: UserStatus.PENDING_VERIFICATION,
          })
        );
      });

      it('should require parent email for minors', async () => {
        const minorData = {
          email: 'child@example.com',
          password: 'Test123!',
          firstName: 'Child',
          lastName: 'User',
          dateOfBirth: '2012-06-15', // 12 years old
          organizationId: 'org-123',
          // Missing parentEmail
        };

        mockUserRepository.findOne.mockResolvedValue(null);

        await expect(
          registrationService.register(minorData, '192.168.1.1')
        ).rejects.toThrow('Parent email is required for users under 13');
      });

      it('should create parental consent request for minors', async () => {
        const minorData = {
          email: 'child@example.com',
          password: 'Test123!',
          firstName: 'Child',
          lastName: 'User',
          dateOfBirth: '2012-06-15',
          parentEmail: 'parent@example.com',
          organizationId: 'org-123',
        };

        const savedUser = {
          id: 'user-123',
          email: minorData.email,
          firstName: minorData.firstName,
          lastName: minorData.lastName,
          isMinor: true,
        };

        mockUserRepository.findOne.mockResolvedValue(null);
        mockUserRepository.create.mockReturnValue(savedUser);
        mockUserRepository.save.mockResolvedValue(savedUser);
        mockConsentRepository.create.mockImplementation((data) => ({
          ...data,
          id: 'consent-123',
        }));
        mockConsentRepository.save.mockImplementation((consent) => Promise.resolve(consent));

        await registrationService.register(minorData, '192.168.1.1');

        expect(mockConsentRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            childUserId: 'user-123',
            parentEmail: 'parent@example.com',
            status: ConsentStatus.PENDING,
          })
        );
      });

      it('should hash IP address for minors', async () => {
        const minorData = {
          email: 'child@example.com',
          password: 'Test123!',
          firstName: 'Child',
          lastName: 'User',
          dateOfBirth: '2012-06-15',
          parentEmail: 'parent@example.com',
          organizationId: 'org-123',
        };

        const ipAddress = '192.168.1.1';
        const expectedIpHash = hashIpAddress(ipAddress);

        mockUserRepository.findOne.mockResolvedValue(null);
        mockUserRepository.create.mockImplementation((data) => ({
          ...data,
          id: 'user-123',
        }));
        mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));
        mockConsentRepository.create.mockImplementation((data) => ({
          ...data,
          id: 'consent-123',
        }));
        mockConsentRepository.save.mockImplementation((consent) => Promise.resolve(consent));

        await registrationService.register(minorData, ipAddress);

        expect(mockUserRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            registrationIpHash: expectedIpHash,
          })
        );
      });
    });

    describe('Adult Registration (13 and over)', () => {
      it('should store full date of birth for adults', async () => {
        const adultData = {
          email: 'adult@example.com',
          password: 'Test123!',
          firstName: 'Adult',
          lastName: 'User',
          dateOfBirth: '1990-06-15', // Adult
          organizationId: 'org-123',
        };

        mockUserRepository.findOne.mockResolvedValue(null);
        mockUserRepository.create.mockImplementation((data) => ({
          ...data,
          id: 'user-456',
        }));
        mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));

        const result = await registrationService.register(adultData, '192.168.1.1');

        expect(mockUserRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            dateOfBirth: new Date('1990-06-15'),
            birthYear: null,
            isMinor: false,
            parentEmail: null,
            status: UserStatus.ACTIVE,
          })
        );
      });
    });
  });

  describe('Parental Consent Processing', () => {
    it('should approve consent with all required fields', async () => {
      const consentToken = 'valid-token-123';
      const consent = {
        id: 'consent-123',
        consentToken,
        childUserId: 'user-123',
        status: ConsentStatus.PENDING,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        childUser: {
          id: 'user-123',
          organizationId: 'org-123',
        },
      };

      const parentDetails = {
        firstName: 'Parent',
        lastName: 'Name',
        dataCollection: true,
        paymentProcessing: true,
        communication: true,
        termsAccepted: true,
        privacyPolicyAccepted: true,
      };

      mockConsentRepository.findOne.mockResolvedValue(consent);
      mockConsentRepository.save.mockImplementation((c) => Promise.resolve(c));
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      const result = await registrationService.processParentalConsent(
        consentToken,
        true,
        parentDetails,
        '192.168.1.1'
      );

      expect(result.status).toBe(ConsentStatus.APPROVED);
      expect(result.consentDetails).toMatchObject(parentDetails);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        { id: 'user-123' },
        { status: UserStatus.ACTIVE }
      );
    });

    it('should set consent expiration to 1 year', async () => {
      const consentToken = 'valid-token-123';
      const consent = {
        id: 'consent-123',
        consentToken,
        childUserId: 'user-123',
        status: ConsentStatus.PENDING,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        childUser: {
          id: 'user-123',
          organizationId: 'org-123',
        },
      };

      const parentDetails = {
        firstName: 'Parent',
        lastName: 'Name',
        dataCollection: true,
        paymentProcessing: true,
        communication: true,
        termsAccepted: true,
        privacyPolicyAccepted: true,
      };

      mockConsentRepository.findOne.mockResolvedValue(consent);
      mockConsentRepository.save.mockImplementation((c) => Promise.resolve(c));
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      const result = await registrationService.processParentalConsent(
        consentToken,
        true,
        parentDetails,
        '192.168.1.1'
      );

      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      const savedExpiration = new Date(result.expiresAt);
      const timeDiff = Math.abs(savedExpiration.getTime() - oneYearFromNow.getTime());
      
      // Allow 1 minute tolerance for test execution time
      expect(timeDiff).toBeLessThan(60000);
    });

    it('should reject expired consent requests', async () => {
      const consentToken = 'expired-token';
      const consent = {
        id: 'consent-123',
        consentToken,
        status: ConsentStatus.PENDING,
        expiresAt: new Date(Date.now() - 1000), // Expired
        childUser: {
          id: 'user-123',
          organizationId: 'org-123',
        },
      };

      mockConsentRepository.findOne.mockResolvedValue(consent);
      mockConsentRepository.save.mockImplementation((c) => Promise.resolve(c));

      await expect(
        registrationService.processParentalConsent(
          consentToken,
          true,
          {} as any,
          '192.168.1.1'
        )
      ).rejects.toThrow('Consent request has expired');

      expect(mockConsentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ConsentStatus.EXPIRED,
        })
      );
    });
  });

  describe('Payment Consent Validation', () => {
    it('should allow payment for adults without consent check', async () => {
      const userId = 'adult-user-123';
      
      mockUserRepository.findOne.mockResolvedValue({
        id: userId,
        isMinor: false,
      });

      const hasConsent = await registrationService.hasValidPaymentConsent(userId);
      
      expect(hasConsent).toBe(true);
      expect(mockConsentRepository.findOne).not.toHaveBeenCalled();
    });

    it('should require valid payment consent for minors', async () => {
      const userId = 'minor-user-123';
      
      mockUserRepository.findOne.mockResolvedValue({
        id: userId,
        isMinor: true,
      });

      mockConsentRepository.findOne.mockResolvedValue({
        id: 'consent-123',
        status: ConsentStatus.APPROVED,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        consentDetails: {
          paymentProcessing: true,
        },
        isValid: () => true,
        hasPaymentConsent: () => true,
      });

      const hasConsent = await registrationService.hasValidPaymentConsent(userId);
      
      expect(hasConsent).toBe(true);
      expect(mockConsentRepository.findOne).toHaveBeenCalledWith({
        where: {
          childUserId: userId,
          status: ConsentStatus.APPROVED,
        },
        order: {
          consentedAt: 'DESC',
        },
      });
    });

    it('should reject payment without valid consent', async () => {
      const userId = 'minor-user-123';
      
      mockUserRepository.findOne.mockResolvedValue({
        id: userId,
        isMinor: true,
      });

      mockConsentRepository.findOne.mockResolvedValue(null);

      const hasConsent = await registrationService.hasValidPaymentConsent(userId);
      
      expect(hasConsent).toBe(false);
    });

    it('should reject payment with expired consent', async () => {
      const userId = 'minor-user-123';
      
      mockUserRepository.findOne.mockResolvedValue({
        id: userId,
        isMinor: true,
      });

      mockConsentRepository.findOne.mockResolvedValue({
        id: 'consent-123',
        status: ConsentStatus.APPROVED,
        expiresAt: new Date(Date.now() - 1000), // Expired
        consentDetails: {
          paymentProcessing: true,
        },
        isValid: () => false,
        hasPaymentConsent: () => false,
      });

      const hasConsent = await registrationService.hasValidPaymentConsent(userId);
      
      expect(hasConsent).toBe(false);
    });
  });

  describe('Consent Revocation', () => {
    it('should revoke consent and suspend user account', async () => {
      const consentId = 'consent-123';
      const consent = {
        id: consentId,
        childUserId: 'user-123',
        parentEmail: 'parent@example.com',
        status: ConsentStatus.APPROVED,
        childUser: {
          id: 'user-123',
          organizationId: 'org-123',
        },
      };

      mockConsentRepository.findOne.mockResolvedValue(consent);
      mockConsentRepository.save.mockImplementation((c) => Promise.resolve(c));
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      await registrationService.revokeParentalConsent(
        consentId,
        'Parent requested removal',
        'parent@example.com'
      );

      expect(mockConsentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ConsentStatus.REVOKED,
          revocationReason: 'Parent requested removal',
        })
      );

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        { id: 'user-123' },
        { status: UserStatus.SUSPENDED }
      );
    });
  });

  describe('Data Migration', () => {
    it('should update existing minor DOB to year only', async () => {
      const users = [
        {
          id: 'user-1',
          dateOfBirth: new Date('2012-06-15'), // Minor
          isMinor: false,
        },
        {
          id: 'user-2',
          dateOfBirth: new Date('1990-06-15'), // Adult
          isMinor: false,
        },
      ];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(users),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      const updatedCount = await registrationService.updateMinorDobToYearOnly();

      expect(updatedCount).toBe(1);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        { id: 'user-1' },
        {
          birthYear: 2012,
          dateOfBirth: null,
          isMinor: true,
        }
      );
      expect(mockUserRepository.update).not.toHaveBeenCalledWith(
        { id: 'user-2' },
        expect.anything()
      );
    });
  });
});