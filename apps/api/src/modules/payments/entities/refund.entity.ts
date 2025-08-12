import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Payment } from './payment.entity';

export type RefundStatus = 'pending' | 'succeeded' | 'failed' | 'canceled';

@Entity('refunds')
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'payment_id' })
  paymentId: string;

  @Column({ type: 'varchar', length: 255, name: 'stripe_refund_id', unique: true })
  stripeRefundId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ 
    type: 'varchar', 
    length: 50,
    enum: ['pending', 'succeeded', 'failed', 'canceled']
  })
  status: RefundStatus;

  @Column({ type: 'varchar', length: 50 })
  reason: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Payment, payment => payment.refunds)
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;
}