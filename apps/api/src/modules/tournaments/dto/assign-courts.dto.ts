import { IsObject, IsOptional, IsBoolean, ValidateNested, Type } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class CourtAssignmentCriteria {
  @ApiProperty({ required: false, description: 'Match importance mapping (matchId -> importance 0-10)' })
  @IsOptional()
  @IsObject()
  matchImportance?: Record<string, number>;

  @ApiProperty({ required: false, description: 'Team court preferences (teamId -> preferred courtIds)' })
  @IsOptional()
  @IsObject()
  teamPreferences?: Record<string, string[]>;

  @ApiProperty({ required: false, description: 'Court reservations (courtId -> reserved for matchIds)' })
  @IsOptional()
  @IsObject()
  courtReservations?: Record<string, string[]>;

  @ApiProperty({ required: false, description: 'Minimize travel for multi-venue tournaments' })
  @IsOptional()
  @IsBoolean()
  minimizeTravel?: boolean;

  @ApiProperty({ required: false, description: 'Distribute matches evenly across courts' })
  @IsOptional()
  @IsBoolean()
  balanceLoad?: boolean;

  @ApiProperty({ required: false, description: 'Keep teams on same court when possible' })
  @IsOptional()
  @IsBoolean()
  preserveContinuity?: boolean;
}

export class AssignCourtsDto {
  @ApiProperty({ type: CourtAssignmentCriteria, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CourtAssignmentCriteria)
  criteria?: CourtAssignmentCriteria;
}