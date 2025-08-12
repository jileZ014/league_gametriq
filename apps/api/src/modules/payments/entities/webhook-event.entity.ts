import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type WebhookEventStatus = 'pending' | 'processed' | 'failed';

@Entity('webhook_events')
@Index(['stripeEventId'], { unique: true })
@Index(['type'])
@Index(['status'])
@Index(['createdAt'])
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, name: 'stripe_event_id', unique: true })
  stripeEventId: string;

  @Column({ type: 'varchar', length: 100 })
  type: string;

  @Column({ 
    type: 'varchar', 
    length: 20,
    enum: ['pending', 'processed', 'failed'],
    default: 'pending'
  })
  status: WebhookEventStatus;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamp', name: 'processed_at', nullable: true })
  processedAt: Date;
}