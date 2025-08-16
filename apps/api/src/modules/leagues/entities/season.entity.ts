import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { League } from './league.entity';

@Entity('seasons')
export class Season {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  leagueId: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'date', nullable: true })
  registrationStartDate: Date;

  @Column({ type: 'date', nullable: true })
  registrationEndDate: Date;

  @Column({ 
    type: 'enum',
    enum: ['upcoming', 'registration', 'active', 'completed', 'cancelled'],
    default: 'upcoming'
  })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  settings: any;

  @ManyToOne(() => League, league => league.seasons)
  @JoinColumn({ name: 'leagueId' })
  league: League;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}