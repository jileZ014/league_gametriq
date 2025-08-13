import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { SubscriptionItem } from './subscription-item.entity';
import { Invoice } from './invoice.entity';

export type SubscriptionStatus = 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing';
export type PlanType = 'monthly' | 'yearly' | 'seasonal';

@Entity('subscriptions')
@Index(['userId'])
@Index(['stripeSubscriptionId'], { unique: true })
@Index(['status'])
@Index(['createdAt'])
@Index(['currentPeriodEnd'])
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 255, unique: true, name: 'stripe_subscription_id' })
  stripeSubscriptionId: string;

  @Column({ type: 'varchar', length: 255, name: 'price_id' })
  priceId: string;

  @Column({ 
    type: 'varchar', 
    length: 50,
    enum: ['active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'trialing']
  })
  status: SubscriptionStatus;

  @Column({ 
    type: 'varchar', 
    length: 50,
    enum: ['monthly', 'yearly', 'seasonal'],
    name: 'plan_type'
  })
  planType: PlanType;

  @Column({ type: 'varchar', length: 255, name: 'plan_name' })
  planName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'timestamp', name: 'current_period_start' })
  currentPeriodStart: Date;

  @Column({ type: 'timestamp', name: 'current_period_end' })
  currentPeriodEnd: Date;

  @Column({ type: 'boolean', default: false, name: 'cancel_at_period_end' })
  cancelAtPeriodEnd: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'trial_end' })
  trialEnd?: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => SubscriptionItem, item => item.subscription)
  items: SubscriptionItem[];

  @OneToMany(() => Invoice, invoice => invoice.subscription)
  invoices: Invoice[];
}