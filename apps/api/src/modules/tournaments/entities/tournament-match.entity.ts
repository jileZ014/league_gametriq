import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tournament } from './tournament.entity';
import { TournamentTeam } from './tournament-team.entity';
import { TournamentCourt } from './tournament-court.entity';

export enum MatchStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  HALFTIME = 'halftime',
  COMPLETED = 'completed',
  POSTPONED = 'postponed',
  CANCELLED = 'cancelled',
  FORFEITED = 'forfeited',
  NO_CONTEST = 'no_contest',
}

export enum MatchType {
  POOL_PLAY = 'pool_play',
  BRACKET = 'bracket',
  PLACEMENT = 'placement',
  CONSOLATION = 'consolation',
  CHAMPIONSHIP = 'championship',
  THIRD_PLACE = 'third_place',
  QUARTERFINAL = 'quarterfinal',
  SEMIFINAL = 'semifinal',
  FINAL = 'final',
}

@Entity('tournament_matches')
@Index(['tournamentId', 'round', 'position'])
@Index(['tournamentId', 'status'])
@Index(['scheduledTime'])
@Index(['courtId'])
export class TournamentMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  tournamentId: string;

  @Column({ type: 'varchar', length: 100 })
  matchNumber: string; // e.g., "QF1", "SF2", "F", "R1M1"

  @Column({ type: 'int' })
  round: number;

  @Column({ type: 'int' })
  position: number; // Position within the round

  @Column({
    type: 'enum',
    enum: MatchType,
    default: MatchType.BRACKET,
  })
  matchType: MatchType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bracket: string; // 'winners', 'losers', or pool ID

  @Column({ type: 'uuid', nullable: true })
  @Index()
  homeTeamId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  awayTeamId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  homeTeamPlaceholder: string; // e.g., "Winner of QF1"

  @Column({ type: 'varchar', length: 255, nullable: true })
  awayTeamPlaceholder: string; // e.g., "Winner of QF2"

  @Column({ type: 'int', nullable: true })
  homeTeamSeed: number;

  @Column({ type: 'int', nullable: true })
  awayTeamSeed: number;

  @Column({ type: 'int', default: 0 })
  homeScore: number;

  @Column({ type: 'int', default: 0 })
  awayScore: number;

  @Column({ type: 'jsonb', nullable: true })
  scoreByPeriod: {
    period: number;
    homeScore: number;
    awayScore: number;
    isOvertime?: boolean;
  }[];

  @Column({ type: 'uuid', nullable: true })
  winnerId: string;

  @Column({ type: 'uuid', nullable: true })
  loserId: string;

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.PENDING,
  })
  status: MatchStatus;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  scheduledTime: Date;

  @Column({ type: 'int', nullable: true })
  duration: number; // in minutes

  @Column({ type: 'timestamp', nullable: true })
  actualStartTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualEndTime: Date;

  @Column({ type: 'uuid', nullable: true })
  courtId: string;

  @Column({ type: 'uuid', nullable: true })
  venueId: string;

  @Column({ type: 'jsonb', nullable: true })
  officials: {
    refereeId?: string;
    refereeName?: string;
    umpireId?: string;
    umpireName?: string;
    scorekeeperId?: string;
    scorekeeperName?: string;
    timekeeperId?: string;
    timekeeperName?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  gameStats: {
    // Team stats
    homeTeamStats?: {
      fieldGoalsMade: number;
      fieldGoalsAttempted: number;
      threePointersMade: number;
      threePointersAttempted: number;
      freeThrowsMade: number;
      freeThrowsAttempted: number;
      rebounds: number;
      assists: number;
      steals: number;
      blocks: number;
      turnovers: number;
      fouls: number;
      timeouts: number;
      technicalFouls: number;
    };
    awayTeamStats?: {
      fieldGoalsMade: number;
      fieldGoalsAttempted: number;
      threePointersMade: number;
      threePointersAttempted: number;
      freeThrowsMade: number;
      freeThrowsAttempted: number;
      rebounds: number;
      assists: number;
      steals: number;
      blocks: number;
      turnovers: number;
      fouls: number;
      timeouts: number;
      technicalFouls: number;
    };
    // Player stats (array)
    playerStats?: {
      playerId: string;
      teamId: string;
      points: number;
      rebounds: number;
      assists: number;
      steals: number;
      blocks: number;
      fouls: number;
      minutesPlayed: number;
    }[];
    // Game flow
    leadChanges?: number;
    timesTied?: number;
    largestLead?: {
      teamId: string;
      points: number;
      time: string;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  nextMatches: {
    winnerTo?: {
      matchId: string;
      position: 'home' | 'away';
    };
    loserTo?: {
      matchId: string;
      position: 'home' | 'away';
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  previousMatches: {
    home?: {
      matchId: string;
      result: 'winner' | 'loser';
    };
    away?: {
      matchId: string;
      result: 'winner' | 'loser';
    };
  };

  @Column({ type: 'boolean', default: false })
  isForfeit: boolean;

  @Column({ type: 'uuid', nullable: true })
  forfeitingTeamId: string;

  @Column({ type: 'text', nullable: true })
  forfeitReason: string;

  @Column({ type: 'boolean', default: false })
  hasOvertime: boolean;

  @Column({ type: 'int', default: 0 })
  overtimePeriods: number;

  @Column({ type: 'jsonb', nullable: true })
  incidents: {
    time: string;
    type: 'technical_foul' | 'ejection' | 'injury' | 'protest' | 'other';
    description: string;
    involvedParties?: string[];
  }[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'boolean', default: false })
  isLive: boolean; // Currently being played

  @Column({ type: 'boolean', default: false })
  isHighlighted: boolean; // Featured match

  @Column({ type: 'int', default: 0 })
  viewerCount: number; // Real-time viewer count

  @Column({ type: 'jsonb', nullable: true })
  streamingInfo: {
    platform?: string;
    url?: string;
    embedCode?: string;
  };

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Tournament, tournament => tournament.matches)
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

  @ManyToOne(() => TournamentTeam, team => team.homeMatches, { nullable: true })
  @JoinColumn({ name: 'homeTeamId' })
  homeTeam: TournamentTeam;

  @ManyToOne(() => TournamentTeam, team => team.awayMatches, { nullable: true })
  @JoinColumn({ name: 'awayTeamId' })
  awayTeam: TournamentTeam;

  @ManyToOne(() => TournamentCourt, court => court.matches, { nullable: true })
  @JoinColumn({ name: 'courtId' })
  court: TournamentCourt;
}