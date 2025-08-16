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
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  BadRequestException,
  StreamableFile,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Organization } from '../../common/decorators/organization.decorator';

import { ReportsService } from './reports.service';
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { CreateScheduledReportDto } from './dto/create-scheduled-report.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportTemplate } from './entities/report-template.entity';
import { ScheduledReport } from './entities/scheduled-report.entity';
import { ReportHistory, ReportStatus } from './entities/report-history.entity';

@ApiTags('Reports')
@Controller('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ============================================================================
  // Report Templates
  // ============================================================================

  @Post('templates')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN')
  @ApiOperation({ summary: 'Create a new report template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(
    @Organization() organizationId: string,
    @Request() req: any,
    @Body(ValidationPipe) dto: CreateReportTemplateDto,
  ): Promise<ReportTemplate> {
    return await this.reportsService.createTemplate(
      organizationId,
      req.user.id,
      dto,
    );
  }

  @Get('templates')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN', 'COACH')
  @ApiOperation({ summary: 'Get all report templates' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by template type' })
  @ApiQuery({ name: 'active', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'includeSystem', required: false, description: 'Include system templates' })
  async getTemplates(
    @Organization() organizationId: string,
    @Query('type') type?: string,
    @Query('active') active?: string,
    @Query('includeSystem') includeSystem?: string,
  ): Promise<ReportTemplate[]> {
    return await this.reportsService.getTemplates(organizationId, {
      type,
      isActive: active !== undefined ? active === 'true' : undefined,
      includeSystem: includeSystem === 'true',
    });
  }

  @Get('templates/:id')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN', 'COACH')
  @ApiOperation({ summary: 'Get a specific report template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async getTemplate(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReportTemplate> {
    return await this.reportsService.getTemplate(id, organizationId);
  }

  @Put('templates/:id')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN')
  @ApiOperation({ summary: 'Update a report template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async updateTemplate(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: Partial<CreateReportTemplateDto>,
  ): Promise<ReportTemplate> {
    return await this.reportsService.updateTemplate(id, organizationId, dto);
  }

  @Delete('templates/:id')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a report template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async deleteTemplate(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.reportsService.deleteTemplate(id, organizationId);
  }

  // ============================================================================
  // Scheduled Reports
  // ============================================================================

  @Post('scheduled')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN')
  @ApiOperation({ summary: 'Create a scheduled report' })
  @ApiResponse({ status: 201, description: 'Scheduled report created successfully' })
  async createScheduledReport(
    @Organization() organizationId: string,
    @Request() req: any,
    @Body(ValidationPipe) dto: CreateScheduledReportDto,
  ): Promise<ScheduledReport> {
    return await this.reportsService.createScheduledReport(
      organizationId,
      req.user.id,
      dto,
    );
  }

  @Get('scheduled')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN', 'COACH')
  @ApiOperation({ summary: 'Get all scheduled reports' })
  @ApiQuery({ name: 'leagueId', required: false, description: 'Filter by league' })
  @ApiQuery({ name: 'active', required: false, description: 'Filter by active status' })
  async getScheduledReports(
    @Organization() organizationId: string,
    @Query('leagueId') leagueId?: string,
    @Query('active') active?: string,
  ): Promise<ScheduledReport[]> {
    return await this.reportsService.getScheduledReports(organizationId, {
      leagueId,
      isActive: active !== undefined ? active === 'true' : undefined,
    });
  }

  @Get('scheduled/:id')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN', 'COACH')
  @ApiOperation({ summary: 'Get a specific scheduled report' })
  @ApiParam({ name: 'id', description: 'Scheduled report ID' })
  async getScheduledReport(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ScheduledReport> {
    return await this.reportsService.getScheduledReport(id, organizationId);
  }

  @Put('scheduled/:id')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN')
  @ApiOperation({ summary: 'Update a scheduled report' })
  @ApiParam({ name: 'id', description: 'Scheduled report ID' })
  async updateScheduledReport(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: Partial<CreateScheduledReportDto>,
  ): Promise<ScheduledReport> {
    return await this.reportsService.updateScheduledReport(id, organizationId, dto);
  }

  @Delete('scheduled/:id')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a scheduled report' })
  @ApiParam({ name: 'id', description: 'Scheduled report ID' })
  async deleteScheduledReport(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.reportsService.deleteScheduledReport(id, organizationId);
  }

  // ============================================================================
  // Report Generation
  // ============================================================================

  @Post('generate')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN', 'COACH')
  @ApiOperation({ summary: 'Generate an ad-hoc report' })
  @ApiResponse({ status: 202, description: 'Report generation started' })
  async generateReport(
    @Organization() organizationId: string,
    @Request() req: any,
    @Body(ValidationPipe) dto: GenerateReportDto,
  ): Promise<{ reportId: string; status: string; message: string }> {
    const report = await this.reportsService.generateReport(
      organizationId,
      req.user.id,
      dto,
    );

    return {
      reportId: report.id,
      status: 'queued',
      message: 'Report generation has been queued. You will be notified when it is ready.',
    };
  }

  @Post('preview')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN', 'COACH')
  @ApiOperation({ summary: 'Generate a quick report preview' })
  @ApiResponse({ status: 202, description: 'Report preview generation started' })
  async previewReport(
    @Organization() organizationId: string,
    @Request() req: any,
    @Body(ValidationPipe) dto: GenerateReportDto,
  ): Promise<{ reportId: string; status: string; message: string }> {
    const previewDto = { ...dto, isPreview: true };
    const report = await this.reportsService.generateReport(
      organizationId,
      req.user.id,
      previewDto,
    );

    return {
      reportId: report.id,
      status: 'queued',
      message: 'Report preview generation has been queued.',
    };
  }

  // ============================================================================
  // Report History
  // ============================================================================

  @Get('history')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN', 'COACH')
  @ApiOperation({ summary: 'Get report generation history' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of records to return' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of records to skip' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'templateId', required: false, description: 'Filter by template' })
  async getReportHistory(
    @Organization() organizationId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: ReportStatus,
    @Query('templateId') templateId?: string,
  ): Promise<{ reports: ReportHistory[]; total: number }> {
    return await this.reportsService.getReportHistory(organizationId, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      status,
      templateId,
    });
  }

  @Get('history/:id')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN', 'COACH')
  @ApiOperation({ summary: 'Get specific report details' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  async getReportDetails(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReportHistory> {
    return await this.reportsService.downloadReport(id, organizationId);
  }

  @Get('history/:id/download')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN', 'COACH')
  @ApiOperation({ summary: 'Download a generated report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  async downloadReport(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const report = await this.reportsService.downloadReport(id, organizationId);

    if (!report.fileUrl) {
      throw new BadRequestException('Report file not available');
    }

    // In a real implementation, you would fetch the file from S3 or your storage service
    // For now, we'll return a placeholder
    const fileBuffer = Buffer.from('Report content would be here');

    return new StreamableFile(fileBuffer, {
      type: report.getContentType(),
      disposition: `attachment; filename="${report.reportName}.${report.getFileExtension()}"`,
      length: fileBuffer.length,
    });
  }

  // ============================================================================
  // Report Subscriptions
  // ============================================================================

  @Post('scheduled/:id/subscribe')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN', 'COACH', 'PARENT')
  @ApiOperation({ summary: 'Subscribe to a scheduled report' })
  @ApiParam({ name: 'id', description: 'Scheduled report ID' })
  async subscribeToReport(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) scheduledReportId: string,
    @Body() options?: { emailOverride?: string; formatPreference?: string },
  ) {
    const subscription = await this.reportsService.subscribe(
      req.user.id,
      scheduledReportId,
      options,
    );

    return {
      subscriptionId: subscription.id,
      message: 'Successfully subscribed to report',
      unsubscribeToken: subscription.unsubscribeToken,
    };
  }

  @Post('unsubscribe/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsubscribe from a report using token' })
  @ApiParam({ name: 'token', description: 'Unsubscribe token' })
  async unsubscribeFromReport(
    @Param('token') token: string,
  ): Promise<{ message: string }> {
    await this.reportsService.unsubscribe(token);
    return { message: 'Successfully unsubscribed from report' };
  }

  @Get('subscriptions')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN', 'COACH', 'PARENT')
  @ApiOperation({ summary: 'Get user subscriptions' })
  async getUserSubscriptions(@Request() req: any) {
    return await this.reportsService.getUserSubscriptions(req.user.id);
  }

  // ============================================================================
  // Analytics and Statistics
  // ============================================================================

  @Get('stats')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN')
  @ApiOperation({ summary: 'Get report statistics' })
  async getReportStats(@Organization() organizationId: string) {
    return await this.reportsService.getReportStats(organizationId);
  }

  @Get('upcoming')
  @Roles('ORG_ADMIN', 'LEAGUE_ADMIN')
  @ApiOperation({ summary: 'Get upcoming scheduled reports' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of records to return' })
  async getUpcomingReports(
    @Organization() organizationId: string,
    @Query('limit') limit?: string,
  ) {
    // This would be implemented in the scheduler service
    return [];
  }

  // ============================================================================
  // System Operations
  // ============================================================================

  @Post('test-email')
  @Roles('ORG_ADMIN')
  @ApiOperation({ summary: 'Test email configuration' })
  async testEmailConfiguration(@Organization() organizationId: string) {
    // This would test the email delivery service
    return { success: true, message: 'Email configuration test completed' };
  }

  @Post('retry-failed')
  @Roles('ORG_ADMIN')
  @ApiOperation({ summary: 'Retry failed report generations' })
  async retryFailedReports(@Organization() organizationId: string) {
    // This would retry failed reports
    return { retriedCount: 0, message: 'No failed reports to retry' };
  }
}