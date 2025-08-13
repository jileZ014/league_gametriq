import { IsNumber, IsArray, IsOptional, IsObject, Min, Max, ValidateNested, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class ScorePeriodDto {
  @IsNumber()
  @Min(1)
  period: number;

  @IsNumber()
  @Min(0)
  homeScore: number;

  @IsNumber()
  @Min(0)
  awayScore: number;

  @IsOptional()
  @IsBoolean()
  isOvertime?: boolean;
}

class TeamStatsDto {
  @IsNumber()
  @Min(0)
  fieldGoalsMade: number;

  @IsNumber()
  @Min(0)
  fieldGoalsAttempted: number;

  @IsNumber()
  @Min(0)
  threePointersMade: number;

  @IsNumber()
  @Min(0)
  threePointersAttempted: number;

  @IsNumber()
  @Min(0)
  freeThrowsMade: number;

  @IsNumber()
  @Min(0)
  freeThrowsAttempted: number;

  @IsNumber()
  @Min(0)
  rebounds: number;

  @IsNumber()
  @Min(0)
  assists: number;

  @IsNumber()
  @Min(0)
  steals: number;

  @IsNumber()
  @Min(0)
  blocks: number;

  @IsNumber()
  @Min(0)
  turnovers: number;

  @IsNumber()
  @Min(0)
  @Max(50)
  fouls: number;

  @IsNumber()
  @Min(0)
  @Max(10)
  timeouts: number;

  @IsNumber()
  @Min(0)
  @Max(10)
  technicalFouls: number;
}

class PlayerStatDto {
  @IsString()
  playerId: string;

  @IsString()
  teamId: string;

  @IsNumber()
  @Min(0)
  points: number;

  @IsNumber()
  @Min(0)
  rebounds: number;

  @IsNumber()
  @Min(0)
  assists: number;

  @IsNumber()
  @Min(0)
  steals: number;

  @IsNumber()
  @Min(0)
  blocks: number;

  @IsNumber()
  @Min(0)
  @Max(6)
  fouls: number;

  @IsNumber()
  @Min(0)
  @Max(48)
  minutesPlayed: number;
}

class GameStatsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => TeamStatsDto)
  homeTeamStats?: TeamStatsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TeamStatsDto)
  awayTeamStats?: TeamStatsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlayerStatDto)
  playerStats?: PlayerStatDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  leadChanges?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timesTied?: number;

  @IsOptional()
  @IsObject()
  largestLead?: {
    teamId: string;
    points: number;
    time: string;
  };
}

export class UpdateMatchResultDto {
  @IsNumber()
  @Min(0)
  @Max(500)
  homeScore: number;

  @IsNumber()
  @Min(0)
  @Max(500)
  awayScore: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScorePeriodDto)
  scoreByPeriod?: ScorePeriodDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => GameStatsDto)
  gameStats?: GameStatsDto;

  @IsOptional()
  @IsBoolean()
  isForfeit?: boolean;

  @IsOptional()
  @IsString()
  forfeitingTeamId?: string;

  @IsOptional()
  @IsString()
  forfeitReason?: string;

  @IsOptional()
  @IsBoolean()
  hasOvertime?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  overtimePeriods?: number;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  incidents?: {
    time: string;
    type: 'technical_foul' | 'ejection' | 'injury' | 'protest' | 'other';
    description: string;
    involvedParties?: string[];
  }[];

  @IsOptional()
  @IsString()
  notes?: string;
}