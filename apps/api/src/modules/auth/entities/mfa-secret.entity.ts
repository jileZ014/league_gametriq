import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('mfa_secrets')
export class MfaSecret {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  secret: string;

  @Column({ name: 'backup_codes', type: 'json' })
  backupCodes: string[];

  @Column({ name: 'mfa_method', default: 'totp' })
  mfaMethod: string;

  @Column({ name: 'is_minor_account', default: false })
  isMinorAccount: boolean;

  @Column({ name: 'recovery_email', nullable: true })
  recoveryEmail: string;

  @Column({ name: 'recovery_phone', nullable: true })
  recoveryPhone: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}