import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsUUID,
  IsInt,
  Min,
  Max,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReportScheduleType,
  ReportDeliveryMethod,
  ReportFormat,
  ScheduleConfig,
  Recipient,
} from '../entities/scheduled-report.entity';

export class RecipientDto {
  @ApiProperty({
    description: 'Recipient type',
    enum: ['email', 'role', 'user'],
    example: 'email',
  })
  @IsEnum(['email', 'role', 'user'])
  type: 'email' | 'role' | 'user';

  @ApiProperty({
    description: 'Recipient value (email address, role name, or user ID)',
    example: 'admin@example.com',
  })
  @IsString()
  value: string;

  @ApiPropertyOptional({
    description: 'Display name for the recipient',
    example: 'League Administrator',
  })
  @IsOptional()
  @IsString()
  name?: string;
}

export class ScheduleConfigDto {
  @ApiPropertyOptional({
    description: 'Cron expression for custom schedules',
    example: '0 8 * * 1',
  })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional({
    description: 'Day of week (0=Sunday, 6=Saturday)',
    minimum: 0,
    maximum: 6,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({
    description: 'Day of month (1-31)',
    minimum: 1,
    maximum: 31,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({
    description: 'Hour of day (0-23)',
    minimum: 0,
    maximum: 23,
    example: 8,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  hour?: number;

  @ApiPropertyOptional({
    description: 'Minute of hour (0-59)',
    minimum: 0,
    maximum: 59,
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  minute?: number;

  @ApiPropertyOptional({
    description: 'Timezone for scheduling',
    example: 'America/Phoenix',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class CreateScheduledReportDto {
  @ApiProperty({
    description: 'Report template ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  templateId: string;

  @ApiPropertyOptional({
    description: 'League ID to filter the report',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  leagueId?: string;

  @ApiPropertyOptional({
    description: 'Season ID to filter the report',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsUUID()
  seasonId?: string;

  @ApiPropertyOptional({
    description: 'Division ID to filter the report',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @IsOptional()
  @IsUUID()
  divisionId?: string;

  @ApiProperty({
    description: 'Report name',
    example: 'Weekly Phoenix Flight League Summary',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @Length(2, 255)
  name: string;

  @ApiPropertyOptional({
    description: 'Report description',
    example: 'Weekly summary report for Phoenix Flight Youth Basketball League',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Schedule type',
    enum: ReportScheduleType,
    example: ReportScheduleType.WEEKLY,
  })
  @IsEnum(ReportScheduleType)
  scheduleType: ReportScheduleType;

  @ApiProperty({
    description: 'Schedule configuration',
    type: ScheduleConfigDto,
  })
  @ValidateNested()
  @Type(() => ScheduleConfigDto)
  scheduleConfig: ScheduleConfig;

  @ApiProperty({
    description: 'Report recipients',
    type: [RecipientDto],
    example: [
      { type: 'email', value: 'admin@phoenixflight.com', name: 'League Admin' },
      { type: 'role', value: 'COACH', name: 'All Coaches' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  recipients: Recipient[];

  @ApiPropertyOptional({
    description: 'Delivery method',
    enum: ReportDeliveryMethod,
    default: ReportDeliveryMethod.EMAIL,
  })
  @IsOptional()
  @IsEnum(ReportDeliveryMethod)
  deliveryMethod?: ReportDeliveryMethod;

  @ApiPropertyOptional({
    description: 'Report format',
    enum: ReportFormat,
    default: ReportFormat.PDF,
  })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;

  @ApiPropertyOptional({
    description: 'Additional filters for the report',
    example: { status: 'active', minGames: 1 },
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Include file attachments',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeAttachments?: boolean;

  @ApiPropertyOptional({
    description: 'Include charts in the report',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeCharts?: boolean;

  @ApiPropertyOptional({
    description: 'Timezone for the report',
    default: 'America/Phoenix',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Whether the scheduled report is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum number of retry attempts',
    minimum: 0,
    maximum: 10,
    default: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number;
}