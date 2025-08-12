import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  Req,
  Header,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import * as path from 'path';
import * as fs from 'fs/promises';

import { BrandingService } from './branding.service';
import {
  CreateBrandConfigDto,
  UpdateBrandConfigDto,
  UploadAssetDto,
  ApplyBrandingDto,
  BrandingResponseDto,
  GenerateCssVariablesDto,
} from './dto/brand-config.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Organization } from '../../common/decorators/organization.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('branding')
@Controller('branding')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @Post()
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create branding configuration for organization' })
  @ApiResponse({ status: 201, description: 'Branding created successfully', type: BrandingResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Branding already exists' })
  async createBranding(
    @Organization() organizationId: string,
    @Body(ValidationPipe) dto: CreateBrandConfigDto,
    @CurrentUser() userId: string,
    @Req() request: Request,
  ): Promise<BrandingResponseDto> {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return this.brandingService.createBranding(
      organizationId,
      dto,
      userId,
      ipAddress,
      userAgent,
    );
  }

  @Put(':brandingId')
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update branding configuration' })
  @ApiParam({ name: 'brandingId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Branding updated successfully', type: BrandingResponseDto })
  @ApiResponse({ status: 404, description: 'Branding not found' })
  async updateBranding(
    @Organization() organizationId: string,
    @Param('brandingId', ParseUUIDPipe) brandingId: string,
    @Body(ValidationPipe) dto: UpdateBrandConfigDto,
    @CurrentUser() userId: string,
    @Req() request: Request,
  ): Promise<BrandingResponseDto> {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return this.brandingService.updateBranding(
      organizationId,
      brandingId,
      dto,
      userId,
      ipAddress,
      userAgent,
    );
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current branding configuration' })
  @ApiResponse({ status: 200, description: 'Branding configuration', type: BrandingResponseDto })
  @ApiResponse({ status: 404, description: 'No branding found' })
  async getBranding(
    @Organization() organizationId: string,
    @Query('noCache') noCache?: boolean,
  ): Promise<BrandingResponseDto> {
    const branding = await this.brandingService.getBranding(organizationId, !noCache);
    
    if (!branding) {
      return null;
    }

    return branding;
  }

  @Get('public/:organizationId')
  @Public()
  @ApiOperation({ summary: 'Get public branding configuration (for portals)' })
  @ApiParam({ name: 'organizationId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Public branding configuration' })
  @Header('Cache-Control', 'public, max-age=3600')
  async getPublicBranding(
    @Param('organizationId') organizationId: string,
  ): Promise<Partial<BrandingResponseDto>> {
    const branding = await this.brandingService.getBranding(organizationId);
    
    if (!branding) {
      return null;
    }

    // Return only public-safe fields
    return {
      organizationName: branding.config.organizationName,
      tagline: branding.config.tagline,
      colors: branding.config.colors,
      fonts: branding.config.fonts,
      logos: branding.config.logos,
      borderRadius: branding.config.borderRadius,
      cssVariables: branding.cssVariables,
    };
  }

  @Get('css/:organizationId')
  @Public()
  @ApiOperation({ summary: 'Get branding as CSS file' })
  @ApiParam({ name: 'organizationId', type: 'string' })
  @ApiQuery({ name: 'prefix', required: false, description: 'CSS variable prefix' })
  @ApiResponse({ status: 200, description: 'CSS file with branding variables' })
  @Header('Content-Type', 'text/css')
  @Header('Cache-Control', 'public, max-age=3600')
  async getBrandingCss(
    @Param('organizationId') organizationId: string,
    @Query() query: GenerateCssVariablesDto,
    @Res() response: Response,
  ): Promise<void> {
    const branding = await this.brandingService.getBranding(organizationId);
    
    if (!branding) {
      response.status(HttpStatus.NOT_FOUND).send('/* No branding configuration found */');
      return;
    }

    const css = this.brandingService.generateCssString(
      branding.config,
      query.prefix || '--brand',
    );

    response.send(css);
  }

  @Post(':brandingId/apply')
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply a branding configuration' })
  @ApiParam({ name: 'brandingId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Branding applied successfully' })
  async applyBranding(
    @Organization() organizationId: string,
    @Param('brandingId', ParseUUIDPipe) brandingId: string,
    @Body(ValidationPipe) dto: ApplyBrandingDto,
    @CurrentUser() userId: string,
  ): Promise<BrandingResponseDto> {
    return this.brandingService.applyBranding(
      organizationId,
      { ...dto, brandingId },
      userId,
    );
  }

  @Post(':brandingId/assets')
  @Roles('admin', 'owner')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload branding asset' })
  @ApiParam({ name: 'brandingId', type: 'string' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        assetType: {
          type: 'string',
          enum: ['logo_light', 'logo_dark', 'favicon', 'font', 'other'],
        },
        metadata: {
          type: 'object',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Asset uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or parameters' })
  async uploadAsset(
    @Organization() organizationId: string,
    @Param('brandingId', ParseUUIDPipe) brandingId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body(ValidationPipe) dto: UploadAssetDto,
    @CurrentUser() userId: string,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.brandingService.uploadAsset(
      organizationId,
      brandingId,
      file,
      dto,
      userId,
    );
  }

  @Get('assets/:organizationId/:brandingId/:assetId')
  @Public()
  @ApiOperation({ summary: 'Get branding asset' })
  @ApiResponse({ status: 200, description: 'Asset file' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @Header('Cache-Control', 'public, max-age=31536000')
  async getAsset(
    @Param('organizationId') organizationId: string,
    @Param('brandingId') brandingId: string,
    @Param('assetId') assetId: string,
    @Res() response: Response,
  ): Promise<void> {
    const assetPath = path.join(
      this.brandingService['uploadDir'],
      organizationId,
      brandingId,
      assetId,
    );

    try {
      const stat = await fs.stat(assetPath);
      if (!stat.isFile()) {
        response.status(HttpStatus.NOT_FOUND).send();
        return;
      }

      const file = await fs.readFile(assetPath);
      const ext = path.extname(assetId).toLowerCase();
      
      let contentType = 'application/octet-stream';
      if (ext === '.png') contentType = 'image/png';
      else if (ext === '.svg') contentType = 'image/svg+xml';
      else if (ext === '.ico') contentType = 'image/x-icon';

      response.setHeader('Content-Type', contentType);
      response.send(file);
    } catch (error) {
      response.status(HttpStatus.NOT_FOUND).send();
    }
  }

  @Delete(':brandingId')
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete branding configuration' })
  @ApiParam({ name: 'brandingId', type: 'string' })
  @ApiResponse({ status: 204, description: 'Branding deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete active branding' })
  @ApiResponse({ status: 404, description: 'Branding not found' })
  async deleteBranding(
    @Organization() organizationId: string,
    @Param('brandingId', ParseUUIDPipe) brandingId: string,
    @CurrentUser() userId: string,
    @Req() request: Request,
  ): Promise<void> {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    await this.brandingService.deleteBranding(
      organizationId,
      brandingId,
      userId,
      ipAddress,
      userAgent,
    );
  }

  @Get('history')
  @Roles('admin', 'owner')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get branding change history' })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, default: 0 })
  @ApiResponse({ status: 200, description: 'Branding audit history' })
  async getBrandingHistory(
    @Organization() organizationId: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ): Promise<any[]> {
    return this.brandingService.getBrandingHistory(
      organizationId,
      Math.min(limit, 100),
      offset,
    );
  }

  @Get('default')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get default branding configuration' })
  @ApiResponse({ status: 200, description: 'Default branding configuration' })
  async getDefaultBranding(): Promise<BrandingResponseDto | null> {
    const defaultBranding = await this.brandingService.getDefaultBranding();
    
    if (!defaultBranding) {
      return null;
    }

    return this.brandingService['toBrandingResponse'](defaultBranding);
  }
}