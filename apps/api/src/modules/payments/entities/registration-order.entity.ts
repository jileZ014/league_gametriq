import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { OrderItem } from './order-item.entity';
import { OrderDiscount } from './order-discount.entity';

export type OrderType = 'team_registration' | 'tournament_entry' | 'subscription' | 'referee_certification';
export type OrderStatus = 'draft' | 'pending_payment' | 'paid' | 'cancelled' | 'refunded';

@Entity('registration_orders')
@Index(['userId'])
@Index(['leagueId'])
@Index(['orderType'])
@Index(['status'])
@Index(['createdAt'])
export class RegistrationOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'league_id' })
  leagueId: string;

  @Column({ 
    type: 'varchar', 
    length: 50,
    enum: ['team_registration', 'tournament_entry', 'subscription', 'referee_certification'],
    name: 'order_type'
  })
  orderType: OrderType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_discount', default: 0 })
  totalDiscount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxes: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ 
    type: 'varchar', 
    length: 50,
    enum: ['draft', 'pending_payment', 'paid', 'cancelled', 'refunded']
  })
  status: OrderStatus;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'payment_intent_id' })
  paymentIntentId?: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => OrderItem, item => item.order)
  items: OrderItem[];

  @OneToMany(() => OrderDiscount, discount => discount.order)
  discounts: OrderDiscount[];
}