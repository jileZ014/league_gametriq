import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { PaymentLedger } from './payment-ledger.entity';
import { Refund } from './refund.entity';
import { Dispute } from './dispute.entity';
import { User } from '../../users/entities/user.entity';

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded';

@Entity('payments')
@Index(['userId'])
@Index(['orderId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['userId', 'status', 'createdAt'], { name: 'idx_payments_composite' })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 255, name: 'order_id' })
  orderId: string;

  @Column({ type: 'varchar', length: 255, unique: true, name: 'payment_intent_id' })
  paymentIntentId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ 
    type: 'varchar', 
    length: 50,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded']
  })
  status: PaymentStatus;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.payments)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => PaymentLedger, ledger => ledger.payment)
  ledgerEntries: PaymentLedger[];

  @OneToMany(() => Refund, refund => refund.payment)
  refunds: Refund[];

  @OneToMany(() => Dispute, dispute => dispute.payment)
  disputes: Dispute[];
}