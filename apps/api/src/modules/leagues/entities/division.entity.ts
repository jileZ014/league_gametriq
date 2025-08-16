import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { League } from './league.entity';

@Entity('divisions')
export class Division {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  leagueId: string;

  @Column({ nullable: true })
  ageGroup: string;

  @Column({ nullable: true })
  skillLevel: string;

  @Column({ default: 10 })
  maxTeams: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  rules: any;

  @ManyToOne(() => League, league => league.divisions)
  @JoinColumn({ name: 'leagueId' })
  league: League;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}