import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Subscription } from './subscription.entity';

@Entity('subscription_items')
export class SubscriptionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'subscription_id' })
  subscriptionId: string;

  @Column({ type: 'varchar', length: 255, name: 'price_id' })
  priceId: string;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Subscription, subscription => subscription.items)
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;
}