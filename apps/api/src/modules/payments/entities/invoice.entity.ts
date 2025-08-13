import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Subscription } from './subscription.entity';

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';

@Entity('invoices')
@Index(['subscriptionId'])
@Index(['stripeInvoiceId'], { unique: true })
@Index(['status'])
@Index(['dueDate'])
@Index(['createdAt'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'subscription_id' })
  subscriptionId: string;

  @Column({ type: 'varchar', length: 255, unique: true, name: 'stripe_invoice_id' })
  stripeInvoiceId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ 
    type: 'varchar', 
    length: 50,
    enum: ['draft', 'open', 'paid', 'uncollectible', 'void']
  })
  status: InvoiceStatus;

  @Column({ type: 'timestamp', name: 'due_date' })
  dueDate: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'paid_at' })
  paidAt?: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Subscription, subscription => subscription.invoices)
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;
}