import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
  error: string;
  warning: string;
  info: string;
  success: string;
}

export interface ThemeFonts {
  primary: {
    family: string;
    url?: string;
  };
  secondary?: {
    family: string;
    url?: string;
  };
  sizes: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
}

export interface LogoConfig {
  light: {
    url: string;
    width: number;
    height: number;
  };
  dark?: {
    url: string;
    width: number;
    height: number;
  };
  favicon?: string;
}

export interface BrandingConfig {
  organizationName: string;
  tagline?: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  logos: LogoConfig;
  customCss?: string;
  borderRadius?: string;
  spacing?: {
    unit: number;
    scale: number[];
  };
}

@Entity('branding')
@Index(['organizationId', 'isActive'])
export class Branding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  @Column({ type: 'jsonb' })
  config: BrandingConfig;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ nullable: true })
  version: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'applied_at', type: 'timestamp', nullable: true })
  appliedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}

@Entity('branding_assets')
@Index(['brandingId', 'assetType'])
export class BrandingAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'branding_id' })
  @Index()
  brandingId: string;

  @ManyToOne(() => Branding, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branding_id' })
  branding: Branding;

  @Column({ name: 'asset_type' })
  assetType: 'logo_light' | 'logo_dark' | 'favicon' | 'font' | 'other';

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'file_path' })
  filePath: string;

  @Column({ name: 'file_size' })
  fileSize: number;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column()
  url: string;

  @Column({ name: 'public_url', nullable: true })
  publicUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}

@Entity('branding_audit')
export class BrandingAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'branding_id' })
  @Index()
  brandingId: string;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  @Column()
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';

  @Column({ type: 'jsonb', name: 'previous_config', nullable: true })
  previousConfig: BrandingConfig;

  @Column({ type: 'jsonb', name: 'new_config', nullable: true })
  newConfig: BrandingConfig;

  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, any>;

  @Column({ name: 'performed_by' })
  performedBy: string;

  @CreateDateColumn({ name: 'performed_at' })
  performedAt: Date;

  @Column({ nullable: true })
  reason: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;
}