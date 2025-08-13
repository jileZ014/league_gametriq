import { IsString, IsArray, IsOptional, IsObject, ValidateNested, IsBoolean, IsEnum, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

class RosterPlayerDto {
  @IsString()
  playerId: string;

  @IsString()
  playerName: string;

  @IsString()
  jerseyNumber: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsBoolean()
  isCaptain?: boolean;

  @IsOptional()
  @IsBoolean()
  isEligible?: boolean;
}

class CoachDto {
  @IsString()
  coachId: string;

  @IsString()
  name: string;

  @IsEnum(['head_coach', 'assistant_coach'])
  role: 'head_coach' | 'assistant_coach';

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

class TeamPreferencesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableDates?: string[];

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  unavailableTimes?: {
    date: string;
    times: string[];
  }[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  courtPreferences?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  opponentRestrictions?: string[];
}

export class RegisterTeamDto {
  @IsString()
  teamId: string;

  @IsString()
  teamName: string;

  @IsOptional()
  @IsString()
  divisionId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RosterPlayerDto)
  roster?: RosterPlayerDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoachDto)
  coaches?: CoachDto[];

  @IsOptional()
  @IsObject()
  regularSeasonRecord?: {
    wins: number;
    losses: number;
    ties?: number;
    winPercentage: number;
    pointsFor: number;
    pointsAgainst: number;
  };

  @IsOptional()
  @ValidateNested()
  @Type(() => TeamPreferencesDto)
  preferences?: TeamPreferencesDto;

  @IsOptional()
  @IsString()
  notes?: string;
}