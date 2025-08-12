import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Payment } from './payment.entity';

export type LedgerType = 'charge' | 'refund' | 'dispute' | 'adjustment';

@Entity('payment_ledger')
@Index(['paymentId'])
@Index(['type'])
@Index(['createdAt'])
@Index(['paymentId', 'type', 'createdAt'], { name: 'idx_ledger_composite' })
export class PaymentLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'payment_id' })
  paymentId: string;

  @Column({ 
    type: 'varchar', 
    length: 50,
    enum: ['charge', 'refund', 'dispute', 'adjustment']
  })
  type: LedgerType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number; // Negative for debits

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Payment, payment => payment.ledgerEntries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;
}