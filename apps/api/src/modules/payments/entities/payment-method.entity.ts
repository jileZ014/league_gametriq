import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type PaymentMethodType = 'card' | 'bank_account' | 'paypal' | 'other';

@Entity('payment_methods')
@Index(['userId'])
@Index(['stripePaymentMethodId'], { unique: true })
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 255, name: 'stripe_payment_method_id', unique: true })
  stripePaymentMethodId: string;

  @Column({ 
    type: 'varchar', 
    length: 20,
    enum: ['card', 'bank_account', 'paypal', 'other']
  })
  type: PaymentMethodType;

  @Column({ type: 'varchar', length: 20, nullable: true })
  brand: string;

  @Column({ type: 'varchar', length: 4, nullable: true })
  last4: string;

  @Column({ type: 'integer', name: 'exp_month', nullable: true })
  expMonth: number;

  @Column({ type: 'integer', name: 'exp_year', nullable: true })
  expYear: number;

  @Column({ type: 'boolean', default: false, name: 'is_default' })
  isDefault: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}