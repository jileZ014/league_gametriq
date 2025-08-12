import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EnableMfaDto {
  @ApiPropertyOptional({ description: 'Optional user ID for admin enabling MFA for another user' })
  @IsOptional()
  @IsString()
  userId?: string;
}