import { PartialType } from '@nestjs/mapped-types';
import { CreateTournamentDto } from './create-tournament.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { TournamentStatus } from '../entities/tournament.entity';

export class UpdateTournamentDto extends PartialType(CreateTournamentDto) {
  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;
}