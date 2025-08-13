import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tournament } from './tournament.entity';
import { TournamentMatch } from './tournament-match.entity';

export enum CourtStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance',
  UNAVAILABLE = 'unavailable',
}

export enum CourtQuality {
  CHAMPIONSHIP = 'championship',
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  PRACTICE = 'practice',
}

@Entity('tournament_courts')
@Index(['tournamentId', 'status'])
@Index(['venueId'])
export class TournamentCourt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  tournamentId: string;

  @Column({ type: 'uuid', nullable: true })
  venueId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  courtNumber: string;

  @Column({
    type: 'enum',
    enum: CourtStatus,
    default: CourtStatus.AVAILABLE,
  })
  status: CourtStatus;

  @Column({
    type: 'enum',
    enum: CourtQuality,
    default: CourtQuality.PRIMARY,
  })
  quality: CourtQuality;

  @Column({ type: 'int', default: 1 })
  priority: number; // Lower number = higher priority

  @Column({ type: 'jsonb', nullable: true })
  features: {
    hasScoreboard?: boolean;
    hasShotClock?: boolean;
    hasVideoBoard?: boolean;
    hasAirConditioning?: boolean;
    seatingCapacity?: number;
    flooring?: 'hardwood' | 'sport_court' | 'concrete' | 'other';
    dimensions?: {
      length: number;
      width: number;
      threePointLine?: 'high_school' | 'college' | 'nba';
    };
    lighting?: 'excellent' | 'good' | 'fair' | 'poor';
    amenities?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  availability: {
    date: string; // YYYY-MM-DD
    timeSlots: {
      startTime: string; // HH:MM
      endTime: string; // HH:MM
      isAvailable: boolean;
      reason?: string; // If not available
    }[];
  }[];

  @Column({ type: 'jsonb', nullable: true })
  schedule: {
    matchId: string;
    matchNumber: string;
    startTime: string;
    endTime: string;
    teamIds: string[];
    status: 'scheduled' | 'in_progress' | 'completed';
  }[];

  @Column({ type: 'jsonb', nullable: true })
  restrictions: {
    maxGamesPerDay?: number;
    minRestBetweenGames?: number; // in minutes
    blackoutPeriods?: {
      startTime: string;
      endTime: string;
      reason: string;
    }[];
    reservedFor?: string[]; // Match types or specific rounds
  };

  @Column({ type: 'jsonb', nullable: true })
  location: {
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    latitude?: number;
    longitude?: number;
    parkingInfo?: string;
    directions?: string;
  };

  @Column({ type: 'int', default: 0 })
  gamesPlayed: number;

  @Column({ type: 'int', default: 0 })
  gamesScheduled: number;

  @Column({ type: 'jsonb', nullable: true })
  maintenanceLog: {
    date: string;
    type: 'cleaning' | 'repair' | 'inspection' | 'setup';
    description: string;
    performedBy?: string;
    nextScheduled?: string;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  equipment: {
    scoreboardModel?: string;
    basketType?: string;
    ballsAvailable?: number;
    firstAidKit?: boolean;
    defibrillator?: boolean;
    waterFountain?: boolean;
  };

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  hourlyRate: number; // Cost per hour if applicable

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', nullable: true })
  assignedStaffId: string; // Primary court monitor/supervisor

  @Column({ type: 'jsonb', nullable: true })
  staffSchedule: {
    staffId: string;
    name: string;
    role: 'supervisor' | 'scorekeeper' | 'clock_operator' | 'announcer';
    shift: {
      startTime: string;
      endTime: string;
    };
  }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Tournament, tournament => tournament.courts)
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

  @OneToMany(() => TournamentMatch, match => match.court)
  matches: TournamentMatch[];
}