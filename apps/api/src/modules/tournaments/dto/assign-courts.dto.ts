import { IsObject, IsOptional, IsBoolean, IsArray, IsString } from 'class-validator';

export class AssignCourtsDto {
  @IsOptional()
  @IsObject()
  criteria?: {
    @IsOptional()
    @IsObject()
    matchImportance?: Record<string, number>; // matchId -> importance (0-10)

    @IsOptional()
    @IsObject()
    teamPreferences?: Record<string, string[]>; // teamId -> preferred courtIds

    @IsOptional()
    @IsObject()
    courtReservations?: Record<string, string[]>; // courtId -> reserved for matchIds

    @IsOptional()
    @IsBoolean()
    minimizeTravel?: boolean; // For multi-venue tournaments

    @IsOptional()
    @IsBoolean()
    balanceLoad?: boolean; // Distribute matches evenly

    @IsOptional()
    @IsBoolean()
    preserveContinuity?: boolean; // Keep teams on same court when possible
  };
}