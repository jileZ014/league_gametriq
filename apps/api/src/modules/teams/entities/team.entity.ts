import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TeamMember } from './team-member.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  leagueId: string;

  @Column()
  divisionId: string;

  @Column()
  seasonId: string;

  @Column({ nullable: true })
  coachId: string;

  @Column({ nullable: true })
  assistantCoachId: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  primaryColor: string;

  @Column({ nullable: true })
  secondaryColor: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  contactInfo: any;

  @Column({ type: 'jsonb', nullable: true })
  settings: any;

  @OneToMany(() => TeamMember, member => member.team)
  members: TeamMember[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}