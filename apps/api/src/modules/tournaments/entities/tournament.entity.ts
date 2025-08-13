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

export enum TournamentFormat {
  SINGLE_ELIMINATION = 'single_elimination',
  DOUBLE_ELIMINATION = 'double_elimination',
  ROUND_ROBIN = 'round_robin',
  POOL_PLAY = 'pool_play',
}

export enum TournamentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  REGISTRATION_OPEN = 'registration_open',
  REGISTRATION_CLOSED = 'registration_closed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum SeedingMethod {
  MANUAL = 'manual',
  RANDOM = 'random',
  RANKED = 'ranked',
  SNAKE = 'snake',
}

@Entity('tournaments')
@Index(['organizationId', 'status'])
@Index(['startDate'])
@Index(['format'])
export class Tournament {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TournamentFormat,
    default: TournamentFormat.SINGLE_ELIMINATION,
  })
  format: TournamentFormat;

  @Column({
    type: 'enum',
    enum: TournamentStatus,
    default: TournamentStatus.DRAFT,
  })
  status: TournamentStatus;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  registrationOpenDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  registrationCloseDate: Date;

  @Column({ type: 'int', default: 8 })
  minTeams: number;

  @Column({ type: 'int', default: 64 })
  maxTeams: number;

  @Column({ type: 'int', default: 0 })
  currentTeamCount: number;

  @Column({
    type: 'enum',
    enum: SeedingMethod,
    default: SeedingMethod.RANKED,
  })
  seedingMethod: SeedingMethod;

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    // Game settings
    gameDuration?: number; // in minutes
    quarterDuration?: number; // in minutes
    halftimeDuration?: number; // in minutes
    timeoutDuration?: number; // in seconds
    timeoutsPerHalf?: number;
    foulsToBonus?: number;
    overtimeDuration?: number; // in minutes
    
    // Tournament settings
    poolCount?: number; // for pool play
    teamsPerPool?: number;
    advanceFromPool?: number; // how many teams advance from each pool
    consolationBracket?: boolean;
    thirdPlaceGame?: boolean;
    
    // Scheduling settings
    minRestTime?: number; // minutes between games for same team
    maxGamesPerDay?: number; // per team
    preferredStartTime?: string; // HH:MM format
    preferredEndTime?: string; // HH:MM format
    
    // Court settings
    defaultCourtIds?: string[];
    courtPriorities?: Record<string, number>; // courtId -> priority
    
    // Display settings
    displaySeed?: boolean;
    displayRecord?: boolean;
    publicBracket?: boolean;
    liveScoring?: boolean;
    
    // Rules
    tiebreakers?: string[]; // ordered list of tiebreaker rules
    mercyRule?: {
      enabled: boolean;
      pointDifference: number;
      timeRemaining: number; // minutes
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  prizes: {
    champion?: string;
    runnerUp?: string;
    thirdPlace?: string;
    mvp?: string;
    allTournamentTeam?: boolean;
    other?: Record<string, string>;
  };

  @Column({ type: 'jsonb', nullable: true })
  divisions: {
    id: string;
    name: string;
    ageGroup?: string;
    gender?: 'male' | 'female' | 'mixed';
    skillLevel?: string;
    maxTeams?: number;
  }[];

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  entryFee: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'jsonb', nullable: true })
  venues: {
    venueId: string;
    name: string;
    address: string;
    courts: {
      courtId: string;
      name: string;
      available: boolean;
    }[];
  }[];

  @Column({ type: 'jsonb', nullable: true })
  bracketData: any; // Stores the generated bracket structure

  @Column({ type: 'jsonb', nullable: true })
  schedule: any; // Stores the optimized schedule

  @Column({ type: 'int', default: 0 })
  currentRound: number;

  @Column({ type: 'int', nullable: true })
  totalRounds: number;

  @Column({ type: 'uuid', nullable: true })
  championId: string;

  @Column({ type: 'uuid', nullable: true })
  runnerUpId: string;

  @Column({ type: 'jsonb', nullable: true })
  statistics: {
    totalGamesPlayed?: number;
    totalPointsScored?: number;
    highestScoringGame?: {
      matchId: string;
      score: string;
      teams: string[];
    };
    biggestUpset?: {
      matchId: string;
      winnerId: string;
      winnerSeed: number;
      loserId: string;
      loserSeed: number;
    };
    averageGameScore?: number;
    totalAttendance?: number;
  };

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  // Relations
  @OneToMany(() => TournamentTeam, team => team.tournament)
  teams: TournamentTeam[];

  @OneToMany(() => TournamentMatch, match => match.tournament)
  matches: TournamentMatch[];

  @OneToMany(() => TournamentCourt, court => court.tournament)
  courts: TournamentCourt[];
}

// Import these from their respective files
import { TournamentTeam } from './tournament-team.entity';
import { TournamentMatch } from './tournament-match.entity';
import { TournamentCourt } from './tournament-court.entity';