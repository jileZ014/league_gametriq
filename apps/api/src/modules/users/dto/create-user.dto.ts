import { IsEmail, IsString, IsDateString, IsOptional, MinLength, IsUUID } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEmail()
  @IsOptional()
  parentEmail?: string;

  @IsUUID()
  organizationId: string;
}