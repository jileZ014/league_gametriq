import { IsString, IsEnum, IsDate, IsNumber, IsOptional, IsObject, IsArray, Min, Max, IsBoolean, ValidateNested, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { TournamentFormat, SeedingMethod } from '../entities/tournament.entity';

class TournamentSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(120)
  gameDuration?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(20)
  quarterDuration?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(30)
  halftimeDuration?: number;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(120)
  timeoutDuration?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  timeoutsPerHalf?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(10)
  foulsToBonus?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(15)
  overtimeDuration?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(16)
  poolCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(16)
  teamsPerPool?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8)
  advanceFromPool?: number;

  @IsOptional()
  @IsBoolean()
  consolationBracket?: boolean;

  @IsOptional()
  @IsBoolean()
  thirdPlaceGame?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(240)
  minRestTime?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  maxGamesPerDay?: number;

  @IsOptional()
  @IsString()
  preferredStartTime?: string;

  @IsOptional()
  @IsString()
  preferredEndTime?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defaultCourtIds?: string[];

  @IsOptional()
  @IsObject()
  courtPriorities?: Record<string, number>;

  @IsOptional()
  @IsBoolean()
  displaySeed?: boolean;

  @IsOptional()
  @IsBoolean()
  displayRecord?: boolean;

  @IsOptional()
  @IsBoolean()
  publicBracket?: boolean;

  @IsOptional()
  @IsBoolean()
  liveScoring?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tiebreakers?: string[];

  @IsOptional()
  @IsObject()
  mercyRule?: {
    enabled: boolean;
    pointDifference: number;
    timeRemaining: number;
  };
}

class CourtDto {
  @IsString()
  name: string;

  @IsString()
  courtNumber: string;

  @IsOptional()
  @IsString()
  venueId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsObject()
  features?: any;

  @IsOptional()
  @IsObject()
  location?: any;
}

class DivisionDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  ageGroup?: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'mixed'])
  gender?: 'male' | 'female' | 'mixed';

  @IsOptional()
  @IsString()
  skillLevel?: string;

  @IsOptional()
  @IsNumber()
  @Min(4)
  @Max(128)
  maxTeams?: number;
}

export class CreateTournamentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(TournamentFormat)
  format: TournamentFormat;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  registrationOpenDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  registrationCloseDate?: Date;

  @IsOptional()
  @IsNumber()
  @Min(4)
  @Max(16)
  minTeams?: number;

  @IsOptional()
  @IsNumber()
  @Min(4)
  @Max(128)
  maxTeams?: number;

  @IsOptional()
  @IsEnum(SeedingMethod)
  seedingMethod?: SeedingMethod;

  @IsOptional()
  @ValidateNested()
  @Type(() => TournamentSettingsDto)
  settings?: TournamentSettingsDto;

  @IsOptional()
  @IsObject()
  prizes?: {
    champion?: string;
    runnerUp?: string;
    thirdPlace?: string;
    mvp?: string;
    allTournamentTeam?: boolean;
    other?: Record<string, string>;
  };

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DivisionDto)
  divisions?: DivisionDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  entryFee?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  venues?: {
    venueId: string;
    name: string;
    address: string;
    courts: {
      courtId: string;
      name: string;
      available: boolean;
    }[];
  }[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourtDto)
  courts?: CourtDto[];
}