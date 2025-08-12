import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

import { Branding, BrandingAsset, BrandingAudit, BrandingConfig } from './branding.entity';
import {
  CreateBrandConfigDto,
  UpdateBrandConfigDto,
  UploadAssetDto,
  ApplyBrandingDto,
  BrandingResponseDto,
} from './dto/brand-config.dto';

@Injectable()
export class BrandingService {
  private readonly logger = new Logger(BrandingService.name);
  private readonly uploadDir: string;
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedMimeTypes = ['image/png', 'image/svg+xml'];
  private readonly cachePrefix = 'branding:';
  private readonly cacheTTL = 3600; // 1 hour

  constructor(
    @InjectRepository(Branding)
    private readonly brandingRepository: Repository<Branding>,
    @InjectRepository(BrandingAsset)
    private readonly assetRepository: Repository<BrandingAsset>,
    @InjectRepository(BrandingAudit)
    private readonly auditRepository: Repository<BrandingAudit>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads/branding');
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create upload directory: ${error.message}`);
    }
  }

  async createBranding(
    organizationId: string,
    dto: CreateBrandConfigDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<BrandingResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if organization already has branding
      const existing = await this.brandingRepository.findOne({
        where: { organizationId, isActive: true },
      });

      if (existing) {
        throw new ConflictException('Organization already has active branding configuration');
      }

      // Create new branding configuration
      const branding = this.brandingRepository.create({
        organizationId,
        config: dto as BrandingConfig,
        version: dto.version || '1.0.0',
        createdBy: userId,
        isActive: true,
        isDefault: false,
        metadata: dto.metadata,
      });

      const savedBranding = await queryRunner.manager.save(branding);

      // Create audit log
      await queryRunner.manager.save(BrandingAudit, {
        brandingId: savedBranding.id,
        organizationId,
        action: 'created',
        newConfig: savedBranding.config,
        performedBy: userId,
        ipAddress,
        userAgent,
      });

      await queryRunner.commitTransaction();

      // Clear cache
      await this.clearBrandingCache(organizationId);

      const response = this.toBrandingResponse(savedBranding);
      response.cssVariables = this.generateCssVariables(savedBranding.config);

      return response;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateBranding(
    organizationId: string,
    brandingId: string,
    dto: UpdateBrandConfigDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<BrandingResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const branding = await this.brandingRepository.findOne({
        where: { id: brandingId, organizationId },
      });

      if (!branding) {
        throw new NotFoundException('Branding configuration not found');
      }

      const previousConfig = { ...branding.config };

      // Update branding
      branding.config = dto as BrandingConfig;
      branding.version = dto.version || branding.version;
      branding.updatedBy = userId;
      branding.metadata = { ...branding.metadata, ...dto.metadata };

      const updatedBranding = await queryRunner.manager.save(branding);

      // Create audit log
      await queryRunner.manager.save(BrandingAudit, {
        brandingId: updatedBranding.id,
        organizationId,
        action: 'updated',
        previousConfig,
        newConfig: updatedBranding.config,
        changes: this.calculateChanges(previousConfig, updatedBranding.config),
        performedBy: userId,
        reason: dto.updateReason,
        ipAddress,
        userAgent,
      });

      await queryRunner.commitTransaction();

      // Clear cache
      await this.clearBrandingCache(organizationId);

      const response = this.toBrandingResponse(updatedBranding);
      response.cssVariables = this.generateCssVariables(updatedBranding.config);

      return response;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getBranding(organizationId: string, useCache = true): Promise<BrandingResponseDto | null> {
    const cacheKey = `${this.cachePrefix}${organizationId}`;

    if (useCache) {
      const cached = await this.cacheManager.get<BrandingResponseDto>(cacheKey);
      if (cached) {
        this.logger.debug(`Returning cached branding for organization ${organizationId}`);
        return cached;
      }
    }

    const branding = await this.brandingRepository.findOne({
      where: { organizationId, isActive: true },
    });

    if (!branding) {
      // Try to get default branding
      const defaultBranding = await this.getDefaultBranding();
      if (defaultBranding) {
        const response = this.toBrandingResponse(defaultBranding);
        response.cssVariables = this.generateCssVariables(defaultBranding.config);
        await this.cacheManager.set(cacheKey, response, this.cacheTTL);
        return response;
      }
      return null;
    }

    const response = this.toBrandingResponse(branding);
    response.cssVariables = this.generateCssVariables(branding.config);

    // Cache the result
    await this.cacheManager.set(cacheKey, response, this.cacheTTL);

    return response;
  }

  async getDefaultBranding(): Promise<Branding | null> {
    return this.brandingRepository.findOne({
      where: { isDefault: true, isActive: true },
    });
  }

  async applyBranding(
    organizationId: string,
    dto: ApplyBrandingDto,
    userId: string,
  ): Promise<BrandingResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const branding = await this.brandingRepository.findOne({
        where: { id: dto.brandingId, organizationId },
      });

      if (!branding) {
        throw new NotFoundException('Branding configuration not found');
      }

      // Deactivate current active branding
      await queryRunner.manager.update(
        Branding,
        { organizationId, isActive: true },
        { isActive: false },
      );

      // Activate new branding
      branding.isActive = true;
      branding.appliedAt = new Date();
      const activatedBranding = await queryRunner.manager.save(branding);

      // Create audit log
      await queryRunner.manager.save(BrandingAudit, {
        brandingId: activatedBranding.id,
        organizationId,
        action: 'activated',
        performedBy: userId,
      });

      await queryRunner.commitTransaction();

      // Clear cache immediately if requested
      if (dto.immediate) {
        await this.clearBrandingCache(organizationId);
      } else {
        // Warm up cache before clearing
        const response = this.toBrandingResponse(activatedBranding);
        response.cssVariables = this.generateCssVariables(activatedBranding.config);
        const cacheKey = `${this.cachePrefix}${organizationId}`;
        await this.cacheManager.set(cacheKey, response, this.cacheTTL);
      }

      return this.toBrandingResponse(activatedBranding);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async uploadAsset(
    organizationId: string,
    brandingId: string,
    file: Express.Multer.File,
    dto: UploadAssetDto,
    userId: string,
  ): Promise<BrandingAsset> {
    // Validate file
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`);
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    const branding = await this.brandingRepository.findOne({
      where: { id: brandingId, organizationId },
    });

    if (!branding) {
      throw new NotFoundException('Branding configuration not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Process and save file
      const fileId = uuidv4();
      const fileExtension = path.extname(file.originalname);
      const fileName = `${fileId}${fileExtension}`;
      const fullPath = `${organizationId}/${brandingId}/${fileName}`;
      const filePath = path.join(this.uploadDir, fullPath);

      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Process image if needed
      if (file.mimetype === 'image/png') {
        await sharp(file.buffer)
          .png({ quality: 90 })
          .toFile(filePath);
      } else {
        await fs.writeFile(filePath, file.buffer);
      }

      // Save asset record
      const asset = this.assetRepository.create({
        brandingId,
        assetType: dto.assetType,
        fileName: file.originalname,
        filePath: fullPath,
        fileSize: file.size,
        mimeType: file.mimetype,
        url: `/api/branding/assets/${fullPath}`,
        publicUrl: this.generatePublicUrl(fullPath),
        metadata: dto.metadata,
      });

      const savedAsset = await queryRunner.manager.save(asset);

      // Update branding config if needed
      if (dto.assetType === 'logo_light' || dto.assetType === 'logo_dark' || dto.assetType === 'favicon') {
        await this.updateBrandingAssetUrl(queryRunner, branding, dto.assetType, savedAsset.publicUrl);
      }

      // Create audit log
      await queryRunner.manager.save(BrandingAudit, {
        brandingId,
        organizationId,
        action: 'updated',
        performedBy: userId,
        reason: `Uploaded ${dto.assetType} asset`,
      });

      await queryRunner.commitTransaction();

      // Clear cache
      await this.clearBrandingCache(organizationId);

      return savedAsset;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      // Clean up file if it was saved
      try {
        await fs.unlink(filePath);
      } catch {}
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteBranding(
    organizationId: string,
    brandingId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const branding = await this.brandingRepository.findOne({
        where: { id: brandingId, organizationId },
      });

      if (!branding) {
        throw new NotFoundException('Branding configuration not found');
      }

      if (branding.isActive) {
        throw new BadRequestException('Cannot delete active branding configuration');
      }

      // Create audit log before deletion
      await queryRunner.manager.save(BrandingAudit, {
        brandingId: branding.id,
        organizationId,
        action: 'deleted',
        previousConfig: branding.config,
        performedBy: userId,
        ipAddress,
        userAgent,
      });

      // Delete associated assets and files
      const assets = await this.assetRepository.find({ where: { brandingId } });
      for (const asset of assets) {
        try {
          await fs.unlink(path.join(this.uploadDir, asset.filePath));
        } catch (error) {
          this.logger.error(`Failed to delete asset file: ${asset.filePath}`, error);
        }
      }

      // Delete branding (cascades to assets)
      await queryRunner.manager.remove(branding);

      await queryRunner.commitTransaction();

      // Clear cache
      await this.clearBrandingCache(organizationId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getBrandingHistory(
    organizationId: string,
    limit = 50,
    offset = 0,
  ): Promise<BrandingAudit[]> {
    return this.auditRepository.find({
      where: { organizationId },
      order: { performedAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  generateCssVariables(config: BrandingConfig, prefix = '--brand'): Record<string, string> {
    const variables: Record<string, string> = {};

    // Colors
    variables[`${prefix}-color-primary`] = config.colors.primary;
    variables[`${prefix}-color-secondary`] = config.colors.secondary;
    variables[`${prefix}-color-accent`] = config.colors.accent;
    variables[`${prefix}-color-background`] = config.colors.background;
    variables[`${prefix}-color-surface`] = config.colors.surface;
    variables[`${prefix}-color-text-primary`] = config.colors.text.primary;
    variables[`${prefix}-color-text-secondary`] = config.colors.text.secondary;
    variables[`${prefix}-color-text-disabled`] = config.colors.text.disabled;
    variables[`${prefix}-color-error`] = config.colors.error;
    variables[`${prefix}-color-warning`] = config.colors.warning;
    variables[`${prefix}-color-info`] = config.colors.info;
    variables[`${prefix}-color-success`] = config.colors.success;

    // Fonts
    variables[`${prefix}-font-primary`] = config.fonts.primary.family;
    if (config.fonts.secondary) {
      variables[`${prefix}-font-secondary`] = config.fonts.secondary.family;
    }
    Object.entries(config.fonts.sizes).forEach(([key, value]) => {
      variables[`${prefix}-font-size-${key}`] = value;
    });

    // Border radius
    if (config.borderRadius) {
      variables[`${prefix}-border-radius`] = config.borderRadius;
    }

    // Spacing
    if (config.spacing) {
      variables[`${prefix}-spacing-unit`] = `${config.spacing.unit}px`;
      config.spacing.scale.forEach((multiplier, index) => {
        variables[`${prefix}-spacing-${index}`] = `${config.spacing.unit * multiplier}px`;
      });
    }

    return variables;
  }

  generateCssString(config: BrandingConfig, prefix = '--brand'): string {
    const variables = this.generateCssVariables(config, prefix);
    const cssLines = [':root {'];

    Object.entries(variables).forEach(([key, value]) => {
      cssLines.push(`  ${key}: ${value};`);
    });

    cssLines.push('}');

    // Add font imports if needed
    const fontImports: string[] = [];
    if (config.fonts.primary.url) {
      fontImports.push(`@import url('${config.fonts.primary.url}');`);
    }
    if (config.fonts.secondary?.url) {
      fontImports.push(`@import url('${config.fonts.secondary.url}');`);
    }

    // Add custom CSS if provided
    if (config.customCss) {
      cssLines.push('', '/* Custom CSS */', config.customCss);
    }

    return fontImports.join('\n') + '\n\n' + cssLines.join('\n');
  }

  private async clearBrandingCache(organizationId: string): Promise<void> {
    const cacheKey = `${this.cachePrefix}${organizationId}`;
    await this.cacheManager.del(cacheKey);
    this.logger.debug(`Cleared branding cache for organization ${organizationId}`);
  }

  private calculateChanges(
    previousConfig: BrandingConfig,
    newConfig: BrandingConfig,
  ): Record<string, any> {
    const changes: Record<string, any> = {};

    // Simple diff implementation - in production, use a proper diff library
    const keys = new Set([
      ...Object.keys(previousConfig),
      ...Object.keys(newConfig),
    ]);

    keys.forEach((key) => {
      if (JSON.stringify(previousConfig[key]) !== JSON.stringify(newConfig[key])) {
        changes[key] = {
          from: previousConfig[key],
          to: newConfig[key],
        };
      }
    });

    return changes;
  }

  private async updateBrandingAssetUrl(
    queryRunner: any,
    branding: Branding,
    assetType: string,
    url: string,
  ): Promise<void> {
    const config = { ...branding.config };

    switch (assetType) {
      case 'logo_light':
        config.logos.light.url = url;
        break;
      case 'logo_dark':
        if (config.logos.dark) {
          config.logos.dark.url = url;
        }
        break;
      case 'favicon':
        config.logos.favicon = url;
        break;
    }

    branding.config = config;
    await queryRunner.manager.save(branding);
  }

  private generatePublicUrl(filePath: string): string {
    const baseUrl = this.configService.get<string>('PUBLIC_URL', 'http://localhost:3000');
    return `${baseUrl}/api/branding/assets/${filePath}`;
  }

  private toBrandingResponse(branding: Branding): BrandingResponseDto {
    return {
      id: branding.id,
      organizationId: branding.organizationId,
      config: branding.config as CreateBrandConfigDto,
      isActive: branding.isActive,
      isDefault: branding.isDefault,
      version: branding.version,
      createdBy: branding.createdBy,
      updatedBy: branding.updatedBy,
      createdAt: branding.createdAt,
      updatedAt: branding.updatedAt,
      appliedAt: branding.appliedAt,
    };
  }
}