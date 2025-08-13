import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('registration_fees')
@Index(['leagueId'])
@Index(['division'])
@Index(['leagueId', 'division'], { unique: true })
export class RegistrationFee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'league_id' })
  leagueId: string;

  @Column({ type: 'varchar', length: 100 })
  division: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'base_amount' })
  baseAmount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'early_bird_discount' })
  earlyBirdDiscount: number; // Percentage

  @Column({ type: 'timestamp', name: 'early_bird_deadline' })
  earlyBirdDeadline: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'late_registration_fee' })
  lateRegistrationFee: number;

  @Column({ type: 'timestamp', name: 'late_registration_date' })
  lateRegistrationDate: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'multi_team_discount' })
  multiTeamDiscount: number; // Percentage

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}