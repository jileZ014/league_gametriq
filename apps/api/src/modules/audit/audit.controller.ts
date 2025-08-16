import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService, AuditLogFilter } from './audit.service';
import { AuditLog, AuditAction, AuditEventStatus } from './audit.entity';

// These would be imported from your auth module
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';
// import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('audit')
@Controller('api/audit')
// @UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Query audit logs' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'status', required: false, enum: AuditEventStatus })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, default: 0 })
  // @Roles('admin', 'auditor')
  async queryLogs(
    @Query() query: any,
    // @CurrentUser() user: any,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    // Validate permissions
    // Non-admin users can only view their own organization's logs
    const filter: AuditLogFilter = {
      organizationId: query.organizationId,
      userId: query.userId,
      action: query.action,
      status: query.status,
      entityType: query.entityType,
      entityId: query.entityId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: Math.min(parseInt(query.limit as string) || 50, 1000),
      offset: parseInt(query.offset as string) || 0,
    };

    // If not admin, restrict to user's organization
    // if (!user.roles?.includes('admin') && user.organizationId) {
    //   filter.organizationId = user.organizationId;
    // }

    return this.auditService.findLogs(filter);
  }

  @Get('logs/entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get audit history for a specific entity' })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 50 })
  // @Roles('admin', 'auditor', 'user')
  async getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit: string = '50',
    // @CurrentUser() user: any,
  ): Promise<AuditLog[]> {
    // Validate access to entity
    // This would check if the user has permission to view this entity's history
    
    const parsedLimit = Math.min(parseInt(limit as string) || 50, 200);
    return this.auditService.getEntityHistory(entityType, entityId, parsedLimit);
  }

  @Get('logs/my-activity')
  @ApiOperation({ summary: 'Get current user\'s audit activity' })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, default: 0 })
  async getMyActivity(
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    // @CurrentUser() user: any,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const filter: AuditLogFilter = {
      // userId: user.id,
      limit: Math.min(parseInt(limit as string) || 50, 200),
      offset: parseInt(offset as string) || 0,
    };

    return this.auditService.findLogs(filter);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get audit statistics summary' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  // @Roles('admin', 'auditor')
  async getStatsSummary(
    @Query() query: any,
    // @CurrentUser() user: any,
  ): Promise<any> {
    // This would return aggregated statistics
    // Implementation would depend on your specific needs
    
    throw new HttpException(
      'Statistics endpoint not implemented',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}