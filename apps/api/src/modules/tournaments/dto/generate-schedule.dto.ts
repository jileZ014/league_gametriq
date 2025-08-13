import { IsNumber, IsString, IsOptional, Min, Max, Matches } from 'class-validator';

export class GenerateScheduleDto {
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(240)
  minRestTime?: number; // Minutes between games for same team

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  maxGamesPerDay?: number; // Maximum games per team per day

  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  startTime?: string; // HH:MM format

  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  endTime?: string; // HH:MM format

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(120)
  gameDuration?: number; // Minutes including warmup and buffer
}