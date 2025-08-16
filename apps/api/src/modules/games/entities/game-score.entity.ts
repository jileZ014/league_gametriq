import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('game_scores')
export class GameScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  gameId: string;

  @Column({ default: 0 })
  homeScore: number;

  @Column({ default: 0 })
  awayScore: number;

  @Column({ type: 'jsonb', nullable: true })
  quarterScores: any;

  @Column({ default: 1 })
  currentQuarter: number;

  @Column({ default: '12:00' })
  timeRemaining: string;

  @Column({ default: 0 })
  homeFouls: number;

  @Column({ default: 0 })
  awayFouls: number;

  @Column({ default: 0 })
  homeTimeouts: number;

  @Column({ default: 0 })
  awayTimeouts: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}