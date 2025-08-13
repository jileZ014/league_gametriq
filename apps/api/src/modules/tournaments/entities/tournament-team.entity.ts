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
  Unique,
} from 'typeorm';
import { Tournament } from './tournament.entity';
import { TournamentMatch } from './tournament-match.entity';

export enum TeamStatus {
  REGISTERED = 'registered',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  ACTIVE = 'active',
  ELIMINATED = 'eliminated',
  WITHDRAWN = 'withdrawn',
  DISQUALIFIED = 'disqualified',
}

@Entity('tournament_teams')
@Unique(['tournamentId', 'teamId'])
@Index(['tournamentId', 'status'])
@Index(['tournamentId', 'seed'])
@Index(['poolId'])
export class TournamentTeam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  tournamentId: string;

  @Column({ type: 'uuid' })
  @Index()
  teamId: string;

  @Column({ type: 'varchar', length: 255 })
  teamName: string;

  @Column({ type: 'uuid', nullable: true })
  divisionId: string;

  @Column({ type: 'int', nullable: true })
  seed: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  poolId: string; // For pool play format

  @Column({
    type: 'enum',
    enum: TeamStatus,
    default: TeamStatus.REGISTERED,
  })
  status: TeamStatus;

  @Column({ type: 'jsonb', nullable: true })
  registration: {
    registeredAt: Date;
    registeredBy: string;
    paymentStatus: 'pending' | 'paid' | 'refunded';
    paymentId?: string;
    confirmationCode?: string;
    notes?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  roster: {
    playerId: string;
    playerName: string;
    jerseyNumber: string;
    position?: string;
    isCaptain?: boolean;
    isEligible?: boolean;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  coaches: {
    coachId: string;
    name: string;
    role: 'head_coach' | 'assistant_coach';
    phone?: string;
    email?: string;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  regularSeasonRecord: {
    wins: number;
    losses: number;
    ties?: number;
    winPercentage: number;
    pointsFor: number;
    pointsAgainst: number;
    lastGames?: {
      opponentId: string;
      result: 'W' | 'L' | 'T';
      score: string;
    }[];
  };

  @Column({ type: 'jsonb', nullable: true })
  tournamentRecord: {
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
    currentStreak?: {
      type: 'W' | 'L';
      count: number;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  poolPlayRecord: {
    played: number;
    wins: number;
    losses: number;
    ties?: number;
    pointsFor: number;
    pointsAgainst: number;
    pointDifferential: number;
    headToHead?: Record<string, {
      result: 'W' | 'L' | 'T';
      score: string;
    }>;
  };

  @Column({ type: 'jsonb', nullable: true })
  statistics: {
    averagePointsPerGame?: number;
    averagePointsAgainst?: number;
    highestScore?: number;
    lowestScore?: number;
    largestMarginOfVictory?: number;
    totalFouls?: number;
    totalTimeouts?: number;
    totalTechnicalFouls?: number;
  };

  @Column({ type: 'int', default: 0 })
  currentRound: number; // Which round they're currently in

  @Column({ type: 'int', nullable: true })
  eliminatedInRound: number; // Round where team was eliminated

  @Column({ type: 'uuid', nullable: true })
  eliminatedBy: string; // Team ID that eliminated them

  @Column({ type: 'int', nullable: true })
  finalPlacement: number; // Final tournament placement (1st, 2nd, 3rd, etc.)

  @Column({ type: 'timestamp', nullable: true })
  checkedInAt: Date;

  @Column({ type: 'uuid', nullable: true })
  checkedInBy: string;

  @Column({ type: 'boolean', default: false })
  isWaitlisted: boolean;

  @Column({ type: 'int', nullable: true })
  waitlistPosition: number;

  @Column({ type: 'jsonb', nullable: true })
  preferences: {
    availableDates?: string[];
    unavailableTimes?: {
      date: string;
      times: string[];
    }[];
    courtPreferences?: string[];
    opponentRestrictions?: string[]; // Team IDs they shouldn't play against
  };

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Tournament, tournament => tournament.teams)
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

  @OneToMany(() => TournamentMatch, match => match.homeTeam)
  homeMatches: TournamentMatch[];

  @OneToMany(() => TournamentMatch, match => match.awayTeam)
  awayMatches: TournamentMatch[];
}