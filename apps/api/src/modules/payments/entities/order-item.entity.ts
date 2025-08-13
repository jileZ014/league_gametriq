import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { RegistrationOrder } from './registration-order.entity';

export type ItemType = 'registration_fee' | 'tournament_fee' | 'late_fee' | 'certification_fee';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ 
    type: 'varchar', 
    length: 50,
    enum: ['registration_fee', 'tournament_fee', 'late_fee', 'certification_fee']
  })
  type: ItemType;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => RegistrationOrder, order => order.items)
  @JoinColumn({ name: 'order_id' })
  order: RegistrationOrder;
}