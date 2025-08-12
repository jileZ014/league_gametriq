import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Payment } from '../../payments/entities/payment.entity';
import { ParentalConsent } from './parental-consent.entity';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  LEAGUE_MANAGER = 'league_manager',
  COACH = 'coach',
  PARENT = 'parent',
  PLAYER = 'player',
  REFEREE = 'referee',
  SCOREKEEPER = 'scorekeeper',
  SPECTATOR = 'spectator',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['organizationId'])
@Index(['status'])
@Index(['createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ name: 'mfa_enabled', default: false })
  mfaEnabled: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  firstName: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  lastName: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PLAYER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status: UserStatus;

  // COPPA Compliance: Store only year for minors
  @Column({ type: 'date', name: 'date_of_birth', nullable: true })
  dateOfBirth: Date;

  // For minors, we only store the year
  @Column({ type: 'integer', name: 'birth_year', nullable: true })
  birthYear: number;

  @Column({ type: 'boolean', name: 'is_minor', default: false })
  isMinor: boolean;

  // Parent email for minors
  @Column({ type: 'varchar', length: 255, name: 'parent_email', nullable: true })
  parentEmail: string;

  // Hashed IP for security
  @Column({ type: 'varchar', length: 64, name: 'registration_ip_hash', nullable: true })
  registrationIpHash: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', name: 'email_verified_at', nullable: true })
  emailVerifiedAt: Date;

  @Column({ type: 'timestamp', name: 'last_login_at', nullable: true })
  lastLoginAt: Date;

  @Column({ name: 'password_changed_at', type: 'timestamp', nullable: true })
  passwordChangedAt: Date;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'last_failed_login', type: 'timestamp', nullable: true })
  lastFailedLogin: Date;

  @Column({ name: 'lockout_until', type: 'timestamp', nullable: true })
  lockoutUntil: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Payment, payment => payment.userId)
  payments: Payment[];

  @OneToMany(() => ParentalConsent, consent => consent.childUser)
  parentalConsents: ParentalConsent[];

  // Helper method to check if user is under 13
  getAge(): number | null {
    if (this.isMinor && this.birthYear) {
      return new Date().getFullYear() - this.birthYear;
    }
    if (this.dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(this.dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }
    return null;
  }

  // Check if user requires parental consent
  requiresParentalConsent(): boolean {
    const age = this.getAge();
    return age !== null && age < 13;
  }
}