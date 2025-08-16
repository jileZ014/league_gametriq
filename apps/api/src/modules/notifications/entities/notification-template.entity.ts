import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({
    type: 'enum',
    enum: ['info', 'success', 'warning', 'error', 'game_update', 'schedule_change', 'payment', 'system'],
    default: 'info'
  })
  type: string;

  @Column({ type: 'simple-array', nullable: true })
  channels: string[];

  @Column({ type: 'jsonb', nullable: true })
  variables: any;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}