import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyMfaDto {
  @ApiProperty({ description: 'MFA token (6 digits or backup code)', example: '123456' })
  @IsString()
  @IsNotEmpty()
  token: string;
}