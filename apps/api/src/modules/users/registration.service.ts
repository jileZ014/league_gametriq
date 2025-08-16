import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { ParentalConsent, ConsentStatus } from './entities/parental-consent.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { hashIpAddress } from '../../utils/ip_hash';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit.entity';

@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ParentalConsent)
    private readonly consentRepository: Repository<ParentalConsent>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Register a new user with COPPA compliance
   */
  async register(createUserDto: CreateUserDto, ipAddress?: string): Promise<User> {
    const { email, password, dateOfBirth, parentEmail, organizationId, ...userData } = createUserDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Calculate age and determine if minor
    const age = this.calculateAge(dateOfBirth);
    const isMinor = age < 13;

    // COPPA compliance: For minors, only store birth year
    let birthYear: number | null = null;
    let dobToStore: Date | null = null;

    if (isMinor) {
      birthYear = new Date(dateOfBirth).getFullYear();
      // Parent email is required for minors
      if (!parentEmail) {
        throw new BadRequestException('Parent email is required for users under 13');
      }
    } else {
      dobToStore = new Date(dateOfBirth);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Hash the IP address
    const ipHash = ipAddress ? hashIpAddress(ipAddress) : null;

    // Create the user
    const user = this.userRepository.create({
      ...userData,
      email,
      password: hashedPassword,
      dateOfBirth: dobToStore,
      birthYear,
      isMinor,
      parentEmail: isMinor ? parentEmail : null,
      registrationIpHash: ipHash,
      organizationId,
      role: UserRole.PLAYER,
      status: isMinor ? UserStatus.PENDING_VERIFICATION : UserStatus.ACTIVE,
    });

    try {
      const savedUser = await this.userRepository.save(user);

      // Log registration
      await this.auditService.log({
        action: AuditAction.REGISTRATION_STARTED,
        userId: savedUser.id,
        organizationId: savedUser.organizationId,
        status: 'success',
        description: `User registered: ${savedUser.email}`,
        metadata: {
          isMinor,
          hasParentEmail: !!parentEmail,
        },
        ipAddress: ipHash,
      });

      // If minor, create parental consent request
      if (isMinor) {
        await this.createParentalConsentRequest(savedUser, parentEmail!);
      }

      return savedUser;
    } catch (error) {
      // Log failed registration
      await this.auditService.log({
        action: AuditAction.REGISTRATION_FAILED,
        organizationId,
        status: 'failure',
        description: `Registration failed for email: ${email}`,
        metadata: {
          error: error.message,
        },
        ipAddress: ipHash,
      });
      throw error;
    }
  }

  /**
   * Create a parental consent request for a minor
   */
  async createParentalConsentRequest(childUser: User, parentEmail: string): Promise<ParentalConsent> {
    // Generate a secure consent token
    const consentToken = crypto.randomBytes(32).toString('hex');

    // Set expiration to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const consent = this.consentRepository.create({
      childUserId: childUser.id,
      parentEmail,
      status: ConsentStatus.PENDING,
      consentToken,
      consentText: this.generateConsentText(childUser),
      expiresAt,
      consentDetails: {
        version: '1.0',
      },
    });

    const savedConsent = await this.consentRepository.save(consent);

    // TODO: Send email to parent with consent link
    // This would typically be handled by an email service

    return savedConsent;
  }

  /**
   * Process parental consent
   */
  async processParentalConsent(
    consentToken: string,
    approved: boolean,
    parentDetails: {
      firstName: string;
      lastName: string;
      dataCollection: boolean;
      paymentProcessing: boolean;
      communication: boolean;
      termsAccepted: boolean;
      privacyPolicyAccepted: boolean;
    },
    ipAddress?: string,
  ): Promise<ParentalConsent> {
    const consent = await this.consentRepository.findOne({
      where: { consentToken },
      relations: ['childUser'],
    });

    if (!consent) {
      throw new BadRequestException('Invalid consent token');
    }

    if (consent.status !== ConsentStatus.PENDING) {
      throw new BadRequestException('Consent has already been processed');
    }

    if (new Date() > new Date(consent.expiresAt)) {
      consent.status = ConsentStatus.EXPIRED;
      await this.consentRepository.save(consent);
      throw new BadRequestException('Consent request has expired');
    }

    // Update consent
    consent.status = approved ? ConsentStatus.APPROVED : ConsentStatus.DENIED;
    consent.parentFirstName = parentDetails.firstName;
    consent.parentLastName = parentDetails.lastName;
    consent.consentedAt = new Date();
    consent.consentIpHash = ipAddress ? hashIpAddress(ipAddress) : null;
    consent.consentDetails = {
      ...consent.consentDetails,
      ...parentDetails,
    };

    // Set expiration to 1 year from consent date
    if (approved) {
      const newExpiresAt = new Date();
      newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1);
      consent.expiresAt = newExpiresAt;

      // Activate the child user account
      await this.userRepository.update(
        { id: consent.childUserId },
        { status: UserStatus.ACTIVE },
      );
    }

    const savedConsent = await this.consentRepository.save(consent);

    // Log the consent action
    await this.auditService.log({
      action: approved ? AuditAction.REGISTRATION_COMPLETED : AuditAction.REGISTRATION_FAILED,
      userId: consent.childUserId,
      organizationId: consent.childUser.organizationId,
      status: approved ? 'success' : 'failure',
      description: `Parental consent ${approved ? 'approved' : 'denied'} for user`,
      metadata: {
        consentId: consent.id,
        parentEmail: consent.parentEmail,
      },
      ipAddress: consent.consentIpHash,
    });

    return savedConsent;
  }

  /**
   * Check if a user has valid parental consent for payments
   */
  async hasValidPaymentConsent(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user || !user.isMinor) {
      return true; // Adults don't need parental consent
    }

    const validConsent = await this.consentRepository.findOne({
      where: {
        childUserId: userId,
        status: ConsentStatus.APPROVED,
      },
      order: {
        consentedAt: 'DESC',
      },
    });

    if (!validConsent) {
      return false;
    }

    return validConsent.hasPaymentConsent();
  }

  /**
   * Revoke parental consent
   */
  async revokeParentalConsent(
    consentId: string,
    reason: string,
    parentEmail: string,
  ): Promise<void> {
    const consent = await this.consentRepository.findOne({
      where: { id: consentId, parentEmail },
      relations: ['childUser'],
    });

    if (!consent) {
      throw new BadRequestException('Consent not found');
    }

    consent.status = ConsentStatus.REVOKED;
    consent.revokedAt = new Date();
    consent.revocationReason = reason;

    await this.consentRepository.save(consent);

    // Deactivate the child user account
    await this.userRepository.update(
      { id: consent.childUserId },
      { status: UserStatus.SUSPENDED },
    );

    // Log the revocation
    await this.auditService.log({
      action: AuditAction.USER_PROFILE_UPDATED,
      userId: consent.childUserId,
      organizationId: consent.childUser.organizationId,
      status: 'warning',
      description: 'Parental consent revoked',
      metadata: {
        consentId: consent.id,
        reason,
      },
    });
  }

  /**
   * Update existing user DOB data for COPPA compliance
   */
  async updateMinorDobToYearOnly(): Promise<number> {
    // Find all users who are minors based on their DOB
    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.dateOfBirth IS NOT NULL')
      .getMany();

    let updatedCount = 0;

    for (const user of users) {
      const age = this.calculateAge(user.dateOfBirth!);
      if (age < 13 && !user.isMinor) {
        // Update to store only birth year
        const birthYear = user.dateOfBirth!.getFullYear();
        
        await this.userRepository.update(
          { id: user.id },
          {
            birthYear,
            dateOfBirth: null,
            isMinor: true,
          },
        );
        
        updatedCount++;
      }
    }

    return updatedCount;
  }

  private calculateAge(dateOfBirth: Date | string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  private generateConsentText(childUser: User): string {
    return `
PARENTAL CONSENT FOR CHILD'S PARTICIPATION IN GAMETRIQ LEAGUE

Child's Name: ${childUser.firstName} ${childUser.lastName}
Child's Email: ${childUser.email}

By providing your consent, you agree to the following:

1. DATA COLLECTION: We collect limited information about your child including:
   - Name and email address
   - Birth year (not full date of birth)
   - Game statistics and performance data
   - Payment information (when you make payments on their behalf)

2. DATA USE: We use this information solely to:
   - Provide league management services
   - Track game statistics
   - Process payments for league fees
   - Communicate about league activities

3. DATA PROTECTION: We implement appropriate security measures to protect your child's information.

4. YOUR RIGHTS: You have the right to:
   - Review your child's personal information
   - Request corrections to their information
   - Revoke consent at any time
   - Request deletion of their account

5. PAYMENT PROCESSING: By consenting, you authorize us to process payments on behalf of your child for league-related fees.

This consent is valid for one year from the date of approval and can be revoked at any time by contacting support.
    `.trim();
  }
}