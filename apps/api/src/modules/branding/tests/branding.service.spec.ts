import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import sharp from 'sharp';

import { BrandingService } from '../branding.service';
import { Branding, BrandingAsset, BrandingAudit } from '../branding.entity';
import { CreateBrandConfigDto, UpdateBrandConfigDto, UploadAssetDto } from '../dto/brand-config.dto';

jest.mock('fs/promises');
jest.mock('sharp');

describe('BrandingService', () => {
  let service: BrandingService;
  let brandingRepository: Repository<Branding>;
  let assetRepository: Repository<BrandingAsset>;
  let auditRepository: Repository<BrandingAudit>;
  let cacheManager: Cache;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-123';
  const mockBrandingId = 'branding-123';

  const mockBrandingConfig: CreateBrandConfigDto = {
    organizationName: 'Test Organization',
    tagline: 'Test Tagline',
    colors: {
      primary: '#1976D2',
      secondary: '#FF4081',
      accent: '#00BCD4',
      background: '#FFFFFF',
      surface: '#F5F5F5',
      text: {
        primary: '#212121',
        secondary: '#757575',
        disabled: '#BDBDBD',
      },
      error: '#F44336',
      warning: '#FF9800',
      info: '#2196F3',
      success: '#4CAF50',
    },
    fonts: {
      primary: {
        family: 'Roboto',
        url: 'https://fonts.googleapis.com/css2?family=Roboto',
      },
      sizes: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
      },
    },
    logos: {
      light: {
        url: 'https://example.com/logo-light.png',
        width: 200,
        height: 60,
      },
      dark: {
        url: 'https://example.com/logo-dark.png',
        width: 200,
        height: 60,
      },
    },
  };

  const mockBranding: Branding = {
    id: mockBrandingId,
    organizationId: mockOrganizationId,
    config: mockBrandingConfig as any,
    isActive: true,
    isDefault: false,
    version: '1.0.0',
    createdBy: mockUserId,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    appliedAt: new Date(),
    metadata: {},
  };

  beforeEach(async () => {
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandingService,
        {
          provide: getRepositoryToken(Branding),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(BrandingAsset),
          useValue: {
            create: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(BrandingAudit),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('./uploads/branding'),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(queryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<BrandingService>(BrandingService);
    brandingRepository = module.get<Repository<Branding>>(getRepositoryToken(Branding));
    assetRepository = module.get<Repository<BrandingAsset>>(getRepositoryToken(BrandingAsset));
    auditRepository = module.get<Repository<BrandingAudit>>(getRepositoryToken(BrandingAudit));
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    dataSource = module.get<DataSource>(DataSource);

    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBranding', () => {
    it('should create a new branding configuration', async () => {
      jest.spyOn(brandingRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(brandingRepository, 'create').mockReturnValue(mockBranding);
      queryRunner.manager.save.mockResolvedValue(mockBranding);
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      const result = await service.createBranding(
        mockOrganizationId,
        mockBrandingConfig,
        mockUserId,
      );

      expect(brandingRepository.findOne).toHaveBeenCalledWith({
        where: { organizationId: mockOrganizationId, isActive: true },
      });
      expect(brandingRepository.create).toHaveBeenCalledWith({
        organizationId: mockOrganizationId,
        config: mockBrandingConfig,
        version: '1.0.0',
        createdBy: mockUserId,
        isActive: true,
        isDefault: false,
        metadata: undefined,
      });
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.id).toBe(mockBrandingId);
      expect(result.cssVariables).toBeDefined();
    });

    it('should throw ConflictException if organization already has active branding', async () => {
      jest.spyOn(brandingRepository, 'findOne').mockResolvedValue(mockBranding);

      await expect(
        service.createBranding(mockOrganizationId, mockBrandingConfig, mockUserId),
      ).rejects.toThrow(ConflictException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('updateBranding', () => {
    it('should update an existing branding configuration', async () => {
      const updateDto: UpdateBrandConfigDto = {
        ...mockBrandingConfig,
        organizationName: 'Updated Organization',
      };

      jest.spyOn(brandingRepository, 'findOne').mockResolvedValue(mockBranding);
      queryRunner.manager.save.mockResolvedValue({
        ...mockBranding,
        config: updateDto,
      });
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      const result = await service.updateBranding(
        mockOrganizationId,
        mockBrandingId,
        updateDto,
        mockUserId,
      );

      expect(brandingRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockBrandingId, organizationId: mockOrganizationId },
      });
      expect(queryRunner.manager.save).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.config.organizationName).toBe('Updated Organization');
    });

    it('should throw NotFoundException if branding does not exist', async () => {
      jest.spyOn(brandingRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.updateBranding(
          mockOrganizationId,
          mockBrandingId,
          mockBrandingConfig,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('getBranding', () => {
    it('should get branding from cache if available', async () => {
      const cachedBranding = { ...mockBranding, cssVariables: {} };
      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedBranding);

      const result = await service.getBranding(mockOrganizationId, true);

      expect(cacheManager.get).toHaveBeenCalledWith(`branding:${mockOrganizationId}`);
      expect(brandingRepository.findOne).not.toHaveBeenCalled();
      expect(result).toEqual(cachedBranding);
    });

    it('should get branding from database and cache it', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(brandingRepository, 'findOne').mockResolvedValue(mockBranding);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const result = await service.getBranding(mockOrganizationId, true);

      expect(brandingRepository.findOne).toHaveBeenCalledWith({
        where: { organizationId: mockOrganizationId, isActive: true },
      });
      expect(cacheManager.set).toHaveBeenCalledWith(
        `branding:${mockOrganizationId}`,
        expect.any(Object),
        3600,
      );
      expect(result.id).toBe(mockBrandingId);
      expect(result.cssVariables).toBeDefined();
    });

    it('should return default branding if organization has no branding', async () => {
      const defaultBranding = { ...mockBranding, isDefault: true };
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(brandingRepository, 'findOne')
        .mockResolvedValueOnce(null) // Organization branding
        .mockResolvedValueOnce(defaultBranding); // Default branding

      const result = await service.getBranding(mockOrganizationId, true);

      expect(result.isDefault).toBe(true);
    });

    it('should return null if no branding exists', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(brandingRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getBranding(mockOrganizationId, true);

      expect(result).toBeNull();
    });
  });

  describe('uploadAsset', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'logo.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.from('fake-image-data'),
      size: 1024,
      stream: null,
      destination: '',
      filename: '',
      path: '',
    };

    const uploadDto: UploadAssetDto = {
      assetType: 'logo_light',
      metadata: { alt: 'Company Logo' },
    };

    it('should upload and save an asset', async () => {
      jest.spyOn(brandingRepository, 'findOne').mockResolvedValue(mockBranding);
      jest.spyOn(assetRepository, 'create').mockReturnValue({
        id: 'asset-123',
        brandingId: mockBrandingId,
        assetType: uploadDto.assetType,
        fileName: mockFile.originalname,
        filePath: expect.any(String),
        fileSize: mockFile.size,
        mimeType: mockFile.mimetype,
        url: expect.any(String),
        publicUrl: expect.any(String),
        metadata: uploadDto.metadata,
        createdAt: new Date(),
      } as BrandingAsset);
      queryRunner.manager.save.mockResolvedValue({ id: 'asset-123' });
      
      const sharpInstance = {
        png: jest.fn().mockReturnThis(),
        toFile: jest.fn().mockResolvedValue(undefined),
      };
      (sharp as unknown as jest.Mock).mockReturnValue(sharpInstance);

      const result = await service.uploadAsset(
        mockOrganizationId,
        mockBrandingId,
        mockFile,
        uploadDto,
        mockUserId,
      );

      expect(brandingRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockBrandingId, organizationId: mockOrganizationId },
      });
      expect(fs.mkdir).toHaveBeenCalled();
      expect(sharp).toHaveBeenCalledWith(mockFile.buffer);
      expect(sharpInstance.png).toHaveBeenCalledWith({ quality: 90 });
      expect(assetRepository.create).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.id).toBe('asset-123');
    });

    it('should reject invalid file types', async () => {
      const invalidFile = { ...mockFile, mimetype: 'image/jpeg' };

      await expect(
        service.uploadAsset(
          mockOrganizationId,
          mockBrandingId,
          invalidFile,
          uploadDto,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject files exceeding size limit', async () => {
      const largeFile = { ...mockFile, size: 6 * 1024 * 1024 }; // 6MB

      await expect(
        service.uploadAsset(
          mockOrganizationId,
          mockBrandingId,
          largeFile,
          uploadDto,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteBranding', () => {
    it('should delete an inactive branding configuration', async () => {
      const inactiveBranding = { ...mockBranding, isActive: false };
      jest.spyOn(brandingRepository, 'findOne').mockResolvedValue(inactiveBranding);
      jest.spyOn(assetRepository, 'find').mockResolvedValue([]);
      queryRunner.manager.remove.mockResolvedValue(undefined);
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      await service.deleteBranding(
        mockOrganizationId,
        mockBrandingId,
        mockUserId,
      );

      expect(brandingRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockBrandingId, organizationId: mockOrganizationId },
      });
      expect(queryRunner.manager.remove).toHaveBeenCalledWith(inactiveBranding);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when trying to delete active branding', async () => {
      jest.spyOn(brandingRepository, 'findOne').mockResolvedValue(mockBranding);

      await expect(
        service.deleteBranding(mockOrganizationId, mockBrandingId, mockUserId),
      ).rejects.toThrow(BadRequestException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if branding does not exist', async () => {
      jest.spyOn(brandingRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.deleteBranding(mockOrganizationId, mockBrandingId, mockUserId),
      ).rejects.toThrow(NotFoundException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('generateCssVariables', () => {
    it('should generate CSS variables from branding config', () => {
      const cssVariables = service.generateCssVariables(mockBranding.config, '--test');

      expect(cssVariables['--test-color-primary']).toBe('#1976D2');
      expect(cssVariables['--test-color-secondary']).toBe('#FF4081');
      expect(cssVariables['--test-font-primary']).toBe('Roboto');
      expect(cssVariables['--test-font-size-base']).toBe('1rem');
      expect(Object.keys(cssVariables).length).toBeGreaterThan(10);
    });

    it('should handle optional fields correctly', () => {
      const configWithoutOptionals = {
        ...mockBranding.config,
        borderRadius: '8px',
        spacing: {
          unit: 8,
          scale: [0.5, 1, 2, 3],
        },
      };

      const cssVariables = service.generateCssVariables(configWithoutOptionals);

      expect(cssVariables['--brand-border-radius']).toBe('8px');
      expect(cssVariables['--brand-spacing-unit']).toBe('8px');
      expect(cssVariables['--brand-spacing-0']).toBe('4px');
      expect(cssVariables['--brand-spacing-1']).toBe('8px');
    });
  });

  describe('generateCssString', () => {
    it('should generate CSS string with variables and imports', () => {
      const cssString = service.generateCssString(mockBranding.config);

      expect(cssString).toContain('@import url(\'https://fonts.googleapis.com/css2?family=Roboto\');');
      expect(cssString).toContain(':root {');
      expect(cssString).toContain('--brand-color-primary: #1976D2;');
      expect(cssString).toContain('--brand-font-primary: Roboto;');
      expect(cssString).toContain('}');
    });

    it('should include custom CSS if provided', () => {
      const configWithCustomCss = {
        ...mockBranding.config,
        customCss: '.custom-class { color: red; }',
      };

      const cssString = service.generateCssString(configWithCustomCss);

      expect(cssString).toContain('/* Custom CSS */');
      expect(cssString).toContain('.custom-class { color: red; }');
    });
  });

  describe('getBrandingHistory', () => {
    it('should return branding audit history', async () => {
      const mockAuditEntries = [
        {
          id: 'audit-1',
          brandingId: mockBrandingId,
          organizationId: mockOrganizationId,
          action: 'created',
          performedBy: mockUserId,
          performedAt: new Date(),
        },
        {
          id: 'audit-2',
          brandingId: mockBrandingId,
          organizationId: mockOrganizationId,
          action: 'updated',
          performedBy: mockUserId,
          performedAt: new Date(),
        },
      ];

      jest.spyOn(auditRepository, 'find').mockResolvedValue(mockAuditEntries as any);

      const result = await service.getBrandingHistory(mockOrganizationId, 10, 0);

      expect(auditRepository.find).toHaveBeenCalledWith({
        where: { organizationId: mockOrganizationId },
        order: { performedAt: 'DESC' },
        take: 10,
        skip: 0,
      });
      expect(result).toEqual(mockAuditEntries);
    });
  });

  describe('applyBranding', () => {
    it('should activate a branding configuration', async () => {
      const inactiveBranding = { ...mockBranding, isActive: false };
      jest.spyOn(brandingRepository, 'findOne').mockResolvedValue(inactiveBranding);
      queryRunner.manager.update.mockResolvedValue(undefined);
      queryRunner.manager.save.mockResolvedValue({
        ...inactiveBranding,
        isActive: true,
        appliedAt: new Date(),
      });
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      const result = await service.applyBranding(
        mockOrganizationId,
        { brandingId: mockBrandingId, immediate: true },
        mockUserId,
      );

      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        Branding,
        { organizationId: mockOrganizationId, isActive: true },
        { isActive: false },
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(cacheManager.del).toHaveBeenCalled();
      expect(result.id).toBe(mockBrandingId);
    });

    it('should warm cache when not immediate', async () => {
      jest.spyOn(brandingRepository, 'findOne').mockResolvedValue(mockBranding);
      queryRunner.manager.update.mockResolvedValue(undefined);
      queryRunner.manager.save.mockResolvedValue(mockBranding);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      await service.applyBranding(
        mockOrganizationId,
        { brandingId: mockBrandingId, immediate: false },
        mockUserId,
      );

      expect(cacheManager.set).toHaveBeenCalled();
      expect(cacheManager.del).not.toHaveBeenCalled();
    });
  });
});