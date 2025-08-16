import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('game_statistics')
export class GameStatistics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  gameId: string;

  @Column()
  playerId: string;

  @Column()
  teamId: string;

  @Column({ default: 0 })
  points: number;

  @Column({ default: 0 })
  rebounds: number;

  @Column({ default: 0 })
  assists: number;

  @Column({ default: 0 })
  steals: number;

  @Column({ default: 0 })
  blocks: number;

  @Column({ default: 0 })
  turnovers: number;

  @Column({ default: 0 })
  fouls: number;

  @Column({ default: 0 })
  minutesPlayed: number;

  @Column({ default: 0 })
  fieldGoalsMade: number;

  @Column({ default: 0 })
  fieldGoalsAttempted: number;

  @Column({ default: 0 })
  threePointersMade: number;

  @Column({ default: 0 })
  threePointersAttempted: number;

  @Column({ default: 0 })
  freeThrowsMade: number;

  @Column({ default: 0 })
  freeThrowsAttempted: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}