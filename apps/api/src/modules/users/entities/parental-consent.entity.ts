import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum ConsentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

@Entity('parental_consents')
@Index(['childUserId'])
@Index(['parentEmail'])
@Index(['status'])
@Index(['expiresAt'])
@Index(['createdAt'])
export class ParentalConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'child_user_id' })
  childUserId: string;

  @Column({ type: 'varchar', length: 255, name: 'parent_email' })
  parentEmail: string;

  @Column({ type: 'varchar', length: 100, name: 'parent_first_name', nullable: true })
  parentFirstName: string;

  @Column({ type: 'varchar', length: 100, name: 'parent_last_name', nullable: true })
  parentLastName: string;

  @Column({
    type: 'enum',
    enum: ConsentStatus,
    default: ConsentStatus.PENDING,
  })
  status: ConsentStatus;

  // Consent token for verification
  @Column({ type: 'varchar', length: 255, name: 'consent_token', unique: true })
  consentToken: string;

  // IP hash when consent was given
  @Column({ type: 'varchar', length: 64, name: 'consent_ip_hash', nullable: true })
  consentIpHash: string;

  // Consent details
  @Column({ type: 'text', name: 'consent_text' })
  consentText: string;

  @Column({ type: 'jsonb', name: 'consent_details', default: {} })
  consentDetails: {
    dataCollection?: boolean;
    paymentProcessing?: boolean;
    communication?: boolean;
    termsAccepted?: boolean;
    privacyPolicyAccepted?: boolean;
    version?: string;
  };

  // Timestamps
  @Column({ type: 'timestamp', name: 'consented_at', nullable: true })
  consentedAt: Date;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamp', name: 'revoked_at', nullable: true })
  revokedAt: Date;

  @Column({ type: 'text', name: 'revocation_reason', nullable: true })
  revocationReason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.parentalConsents)
  @JoinColumn({ name: 'child_user_id' })
  childUser: User;

  // Helper methods
  isValid(): boolean {
    return (
      this.status === ConsentStatus.APPROVED &&
      new Date() < new Date(this.expiresAt) &&
      !this.revokedAt
    );
  }

  hasPaymentConsent(): boolean {
    return this.isValid() && this.consentDetails.paymentProcessing === true;
  }
}