import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { OrderDiscount } from './order-discount.entity';

export type DiscountCodeType = 'percentage' | 'fixed_amount';

@Entity('discount_codes')
@Index(['code'], { unique: true })
@Index(['active'])
@Index(['validFrom', 'validUntil'])
export class DiscountCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  @Column({ 
    type: 'varchar', 
    length: 50,
    enum: ['percentage', 'fixed_amount']
  })
  type: DiscountCodeType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number;

  @Column({ type: 'varchar', length: 3, nullable: true })
  currency?: string;

  @Column({ type: 'integer', nullable: true, name: 'max_uses' })
  maxUses?: number;

  @Column({ type: 'integer', default: 0, name: 'used_count' })
  usedCount: number;

  @Column({ type: 'timestamp', name: 'valid_from' })
  validFrom: Date;

  @Column({ type: 'timestamp', name: 'valid_until' })
  validUntil: Date;

  @Column({ type: 'jsonb', default: [], name: 'applicable_items' })
  applicableItems: string[];

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'minimum_amount' })
  minimumAmount?: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => OrderDiscount, discount => discount.discountCode)
  orderDiscounts: OrderDiscount[];
}