import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type WebhookEventStatus = 'pending' | 'processed' | 'failed';

@Entity('webhook_events')
@Index(['stripeEventId'], { unique: true })
@Index(['eventType'])
@Index(['processed'])
@Index(['createdAt'])
@Index(['failureCount'])
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true, name: 'stripe_event_id' })
  stripeEventId: string;

  @Column({ type: 'varchar', length: 100, name: 'event_type' })
  eventType: string;

  @Column({ type: 'boolean', default: false })
  processed: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'processed_at' })
  processedAt?: Date;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true, name: 'failure_reason' })
  failureReason?: string;

  @Column({ type: 'integer', default: 0, name: 'failure_count' })
  failureCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Legacy fields for backward compatibility
  @Column({ 
    type: 'varchar', 
    length: 20,
    enum: ['pending', 'processed', 'failed'],
    default: 'pending'
  })
  get status(): WebhookEventStatus {
    if (this.processed) return 'processed';
    if (this.failureReason) return 'failed';
    return 'pending';
  }

  @Column({ type: 'varchar', length: 100 })
  get type(): string {
    return this.eventType;
  }

  @Column({ type: 'text', nullable: true })
  get error(): string {
    return this.failureReason;
  }

  @Column({ type: 'integer', default: 0 })
  get attempts(): number {
    return this.failureCount;
  }
}