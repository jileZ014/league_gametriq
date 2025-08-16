import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('schedule_templates')
export class ScheduleTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['round_robin', 'single_elimination', 'double_elimination', 'swiss', 'custom'],
    default: 'round_robin'
  })
  type: string;

  @Column({ type: 'jsonb' })
  rules: any;

  @Column({ type: 'jsonb', nullable: true })
  timeSlots: any[];

  @Column({ type: 'jsonb', nullable: true })
  blackoutDates: Date[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}