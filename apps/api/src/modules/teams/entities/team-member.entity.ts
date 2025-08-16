import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Team } from './team.entity';

@Entity('team_members')
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  teamId: string;

  @Column()
  userId: string;

  @Column()
  jerseyNumber: string;

  @Column({
    type: 'enum',
    enum: ['player', 'coach', 'assistant_coach', 'manager'],
    default: 'player'
  })
  role: string;

  @Column({
    type: 'enum',
    enum: ['guard', 'forward', 'center', 'utility'],
    nullable: true
  })
  position: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  emergencyContact: string;

  @Column({ nullable: true })
  emergencyPhone: string;

  @Column({ type: 'jsonb', nullable: true })
  medicalInfo: any;

  @ManyToOne(() => Team, team => team.members)
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}