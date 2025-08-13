import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { Transfer } from './transfer.entity';

export type AccountType = 'referee' | 'league' | 'venue';
export type AccountStatus = 'pending' | 'restricted' | 'enabled' | 'disabled';
export type StripeAccountType = 'express' | 'standard' | 'custom';

@Entity('connected_accounts')
@Index(['userId'])
@Index(['stripeAccountId'], { unique: true })
@Index(['accountType'])
@Index(['status'])
export class ConnectedAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 255, unique: true, name: 'stripe_account_id' })
  stripeAccountId: string;

  @Column({ 
    type: 'varchar', 
    length: 50,
    enum: ['express', 'standard', 'custom']
  })
  type: StripeAccountType;

  @Column({ 
    type: 'varchar', 
    length: 50,
    enum: ['referee', 'league', 'venue'],
    name: 'account_type'
  })
  accountType: AccountType;

  @Column({ 
    type: 'varchar', 
    length: 50,
    enum: ['pending', 'restricted', 'enabled', 'disabled']
  })
  status: AccountStatus;

  @Column({ type: 'boolean', default: false, name: 'charges_enabled' })
  chargesEnabled: boolean;

  @Column({ type: 'boolean', default: false, name: 'payouts_enabled' })
  payoutsEnabled: boolean;

  @Column({ type: 'jsonb', default: {} })
  capabilities: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Transfer, transfer => transfer.destinationAccount)
  transfers: Transfer[];
}