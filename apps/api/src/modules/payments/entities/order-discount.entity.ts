import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { RegistrationOrder } from './registration-order.entity';
import { DiscountCode } from './discount-code.entity';

export type DiscountType = 'early_bird' | 'multi_team' | 'discount_code' | 'manual';

@Entity('order_discounts')
export class OrderDiscount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'uuid', nullable: true, name: 'discount_code_id' })
  discountCodeId?: string;

  @Column({ 
    type: 'varchar', 
    length: 50,
    enum: ['early_bird', 'multi_team', 'discount_code', 'manual']
  })
  type: DiscountType;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => RegistrationOrder, order => order.discounts)
  @JoinColumn({ name: 'order_id' })
  order: RegistrationOrder;

  @ManyToOne(() => DiscountCode, { nullable: true })
  @JoinColumn({ name: 'discount_code_id' })
  discountCode?: DiscountCode;
}