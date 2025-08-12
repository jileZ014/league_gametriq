import {
  IsString,
  IsOptional,
  IsObject,
  IsBoolean,
  IsUUID,
  IsHexColor,
  IsUrl,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsArray,
  ArrayMaxSize,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ThemeColorDto {
  @ApiProperty({ description: 'Primary brand color', example: '#1976D2' })
  @IsHexColor()
  primary: string;

  @ApiProperty({ description: 'Secondary brand color', example: '#FF4081' })
  @IsHexColor()
  secondary: string;

  @ApiProperty({ description: 'Accent color', example: '#00BCD4' })
  @IsHexColor()
  accent: string;

  @ApiProperty({ description: 'Background color', example: '#FFFFFF' })
  @IsHexColor()
  background: string;

  @ApiProperty({ description: 'Surface color', example: '#F5F5F5' })
  @IsHexColor()
  surface: string;

  @ApiProperty({ description: 'Text colors' })
  @IsObject()
  @ValidateNested()
  @Type(() => TextColorDto)
  text: TextColorDto;

  @ApiProperty({ description: 'Error color', example: '#F44336' })
  @IsHexColor()
  error: string;

  @ApiProperty({ description: 'Warning color', example: '#FF9800' })
  @IsHexColor()
  warning: string;

  @ApiProperty({ description: 'Info color', example: '#2196F3' })
  @IsHexColor()
  info: string;

  @ApiProperty({ description: 'Success color', example: '#4CAF50' })
  @IsHexColor()
  success: string;
}

export class TextColorDto {
  @ApiProperty({ description: 'Primary text color', example: '#212121' })
  @IsHexColor()
  primary: string;

  @ApiProperty({ description: 'Secondary text color', example: '#757575' })
  @IsHexColor()
  secondary: string;

  @ApiProperty({ description: 'Disabled text color', example: '#BDBDBD' })
  @IsHexColor()
  disabled: string;
}

export class FontConfigDto {
  @ApiProperty({ description: 'Font family name', example: 'Roboto' })
  @IsString()
  family: string;

  @ApiPropertyOptional({ description: 'Font URL if custom font', example: 'https://fonts.googleapis.com/css2?family=Roboto' })
  @IsOptional()
  @IsUrl()
  url?: string;
}

export class FontSizesDto {
  @ApiProperty({ example: '0.75rem' })
  @IsString()
  xs: string;

  @ApiProperty({ example: '0.875rem' })
  @IsString()
  sm: string;

  @ApiProperty({ example: '1rem' })
  @IsString()
  base: string;

  @ApiProperty({ example: '1.125rem' })
  @IsString()
  lg: string;

  @ApiProperty({ example: '1.25rem' })
  @IsString()
  xl: string;

  @ApiProperty({ example: '1.5rem' })
  @IsString()
  '2xl': string;
}

export class ThemeFontsDto {
  @ApiProperty({ description: 'Primary font configuration' })
  @ValidateNested()
  @Type(() => FontConfigDto)
  primary: FontConfigDto;

  @ApiPropertyOptional({ description: 'Secondary font configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FontConfigDto)
  secondary?: FontConfigDto;

  @ApiProperty({ description: 'Font size scale' })
  @ValidateNested()
  @Type(() => FontSizesDto)
  sizes: FontSizesDto;
}

export class LogoAssetDto {
  @ApiProperty({ description: 'Logo URL', example: 'https://example.com/logo.png' })
  @IsUrl()
  url: string;

  @ApiProperty({ description: 'Logo width in pixels', example: 200 })
  @IsNumber()
  @Min(50)
  @Max(500)
  width: number;

  @ApiProperty({ description: 'Logo height in pixels', example: 60 })
  @IsNumber()
  @Min(20)
  @Max(200)
  height: number;
}

export class LogoConfigDto {
  @ApiProperty({ description: 'Light theme logo' })
  @ValidateNested()
  @Type(() => LogoAssetDto)
  light: LogoAssetDto;

  @ApiPropertyOptional({ description: 'Dark theme logo' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LogoAssetDto)
  dark?: LogoAssetDto;

  @ApiPropertyOptional({ description: 'Favicon URL', example: 'https://example.com/favicon.ico' })
  @IsOptional()
  @IsUrl()
  favicon?: string;
}

export class SpacingConfigDto {
  @ApiProperty({ description: 'Base spacing unit in pixels', example: 8 })
  @IsNumber()
  @Min(4)
  @Max(16)
  unit: number;

  @ApiProperty({ description: 'Spacing scale multipliers', example: [0.5, 1, 1.5, 2, 3, 4, 6, 8] })
  @IsArray()
  @ArrayMaxSize(10)
  @IsNumber({}, { each: true })
  scale: number[];
}

export class CreateBrandConfigDto {
  @ApiProperty({ description: 'Organization display name', example: 'Acme Corporation' })
  @IsString()
  organizationName: string;

  @ApiPropertyOptional({ description: 'Organization tagline', example: 'Innovation at its finest' })
  @IsOptional()
  @IsString()
  tagline?: string;

  @ApiProperty({ description: 'Theme colors configuration' })
  @ValidateNested()
  @Type(() => ThemeColorDto)
  colors: ThemeColorDto;

  @ApiProperty({ description: 'Font configuration' })
  @ValidateNested()
  @Type(() => ThemeFontsDto)
  fonts: ThemeFontsDto;

  @ApiProperty({ description: 'Logo configuration' })
  @ValidateNested()
  @Type(() => LogoConfigDto)
  logos: LogoConfigDto;

  @ApiPropertyOptional({ description: 'Custom CSS overrides' })
  @IsOptional()
  @IsString()
  customCss?: string;

  @ApiPropertyOptional({ description: 'Border radius (e.g., "4px", "8px")', example: '8px' })
  @IsOptional()
  @IsString()
  borderRadius?: string;

  @ApiPropertyOptional({ description: 'Spacing configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SpacingConfigDto)
  spacing?: SpacingConfigDto;

  @ApiPropertyOptional({ description: 'Version identifier', example: '1.0.0' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateBrandConfigDto extends CreateBrandConfigDto {
  @ApiPropertyOptional({ description: 'Reason for update' })
  @IsOptional()
  @IsString()
  updateReason?: string;
}

export class UploadAssetDto {
  @ApiProperty({ enum: ['logo_light', 'logo_dark', 'favicon', 'font', 'other'] })
  @IsEnum(['logo_light', 'logo_dark', 'favicon', 'font', 'other'])
  assetType: 'logo_light' | 'logo_dark' | 'favicon' | 'font' | 'other';

  @ApiPropertyOptional({ description: 'Additional metadata for the asset' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ApplyBrandingDto {
  @ApiProperty({ description: 'Branding configuration ID to apply' })
  @IsUUID()
  brandingId: string;

  @ApiPropertyOptional({ description: 'Apply immediately without cache warmup', default: false })
  @IsOptional()
  @IsBoolean()
  immediate?: boolean;
}

export class BrandingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  config: CreateBrandConfigDto;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isDefault: boolean;

  @ApiPropertyOptional()
  version?: string;

  @ApiProperty()
  createdBy: string;

  @ApiPropertyOptional()
  updatedBy?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  appliedAt?: Date;

  @ApiPropertyOptional()
  cssVariables?: Record<string, string>;
}

export class GenerateCssVariablesDto {
  @ApiPropertyOptional({ description: 'CSS variable prefix', default: '--brand' })
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiPropertyOptional({ description: 'Include font imports', default: true })
  @IsOptional()
  @IsBoolean()
  includeFontImports?: boolean;
}