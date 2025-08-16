import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Team } from './team.entity';

@Entity('team_standings')
export class TeamStanding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  teamId: string;

  @Column()
  leagueId: string;

  @Column()
  divisionId: string;

  @Column()
  seasonId: string;

  @Column({ default: 0 })
  gamesPlayed: number;

  @Column({ default: 0 })
  wins: number;

  @Column({ default: 0 })
  losses: number;

  @Column({ default: 0 })
  ties: number;

  @Column({ default: 0 })
  points: number;

  @Column({ default: 0 })
  pointsFor: number;

  @Column({ default: 0 })
  pointsAgainst: number;

  @Column({ default: 0 })
  pointDifferential: number;

  @Column({ type: 'decimal', precision: 5, scale: 3, default: 0 })
  winPercentage: number;

  @Column({ default: 0 })
  streak: number;

  @Column({ nullable: true })
  lastGameResult: string;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}