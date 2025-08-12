import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { BrandingController } from './branding.controller';
import { BrandingService } from './branding.service';
import { Branding, BrandingAsset, BrandingAudit } from './branding.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Branding, BrandingAsset, BrandingAudit]),
    CacheModule.register({
      ttl: 3600, // 1 hour default TTL
      max: 100, // Maximum number of items in cache
    }),
    ConfigModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = ['image/png', 'image/svg+xml'];
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error('Invalid file type. Only PNG and SVG files are allowed.'), false);
        }
      },
    }),
  ],
  controllers: [BrandingController],
  providers: [BrandingService],
  exports: [BrandingService],
})
export class BrandingModule {}