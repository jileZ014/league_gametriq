import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Payment } from './payment.entity';
import { ConnectedAccount } from './connected-account.entity';

export type TransferStatus = 'pending' | 'paid' | 'failed' | 'canceled' | 'reversed';

@Entity('transfers')
@Index(['paymentId'])
@Index(['destinationAccountId'])
@Index(['status'])
@Index(['createdAt'])
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, name: 'payment_id' })
  paymentId: string;

  @Column({ type: 'varchar', length: 255, name: 'destination_account_id' })
  destinationAccountId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 255, unique: true, name: 'transfer_id' })
  transferId: string;

  @Column({ 
    type: 'varchar', 
    length: 50,
    enum: ['pending', 'paid', 'failed', 'canceled', 'reversed']
  })
  status: TransferStatus;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Payment, { nullable: true })
  @JoinColumn({ name: 'payment_id', referencedColumnName: 'id' })
  payment: Payment;

  @ManyToOne(() => ConnectedAccount)
  @JoinColumn({ name: 'destination_account_id', referencedColumnName: 'stripeAccountId' })
  destinationAccount: ConnectedAccount;
}