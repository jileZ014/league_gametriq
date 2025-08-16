import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  leagueId: string;

  @Column()
  seasonId: string;

  @Column()
  divisionId: string;

  @Column()
  name: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'active', 'completed'],
    default: 'draft'
  })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  games: any[];

  @Column({ type: 'jsonb', nullable: true })
  settings: any;

  @Column({ type: 'jsonb', nullable: true })
  venues: any[];

  @Column({ default: false })
  isLocked: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}