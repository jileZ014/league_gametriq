import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
  IsUUID,
  IsDateString,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportFormat, ReportDeliveryMethod } from '../entities/scheduled-report.entity';

export class GenerateReportDto {
  @ApiProperty({
    description: 'Report template ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  templateId: string;

  @ApiProperty({
    description: 'Report name',
    example: 'Ad-hoc League Summary - March 2025',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @Length(2, 255)
  name: string;

  @ApiPropertyOptional({
    description: 'Report format',
    enum: ReportFormat,
    default: ReportFormat.PDF,
  })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;

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

  @ApiPropertyOptional({
    description: 'Start date for report data (ISO 8601)',
    example: '2025-03-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for report data (ISO 8601)',
    example: '2025-03-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Additional filters for the report',
    example: { 
      status: 'active', 
      minGames: 1,
      teamIds: ['team1-id', 'team2-id'] 
    },
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Template variables to override defaults',
    example: { 
      showPhotos: true, 
      includeStatistics: true,
      topPlayersCount: 10
    },
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Include charts in the report',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeCharts?: boolean;

  @ApiPropertyOptional({
    description: 'Delivery method for the generated report',
    enum: ReportDeliveryMethod,
    default: ReportDeliveryMethod.IN_APP,
  })
  @IsOptional()
  @IsEnum(ReportDeliveryMethod)
  deliveryMethod?: ReportDeliveryMethod;

  @ApiPropertyOptional({
    description: 'Recipients for the report (email addresses)',
    type: [String],
    example: ['admin@example.com', 'coach@example.com'],
  })
  @IsOptional()
  @IsString({ each: true })
  recipients?: string[];

  @ApiPropertyOptional({
    description: 'Whether this is a preview generation (faster, lower quality)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;
}