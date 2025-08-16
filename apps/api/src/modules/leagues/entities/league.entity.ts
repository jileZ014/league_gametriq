import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Division } from './division.entity';
import { Season } from './season.entity';

@Entity('leagues')
export class League {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  organizationId: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ 
    type: 'enum',
    enum: ['youth', 'adult', 'professional'],
    default: 'youth'
  })
  type: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  settings: any;

  @Column({ type: 'jsonb', nullable: true })
  rules: any;

  @OneToMany(() => Division, division => division.league)
  divisions: Division[];

  @OneToMany(() => Season, season => season.league)
  seasons: Season[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}