import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  findAll(@Request() req: any) {
    return this.notificationsService.findAll(req.user.id);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications' })
  findUnread(@Request() req: any) {
    return this.notificationsService.findUnread(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create notification' })
  create(@Body() createNotificationDto: any) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@Request() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  delete(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.delete(id, req.user.id);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Send bulk notifications' })
  sendBulk(@Body() bulkData: any) {
    const { templateId, userIds, data } = bulkData;
    return this.notificationsService.sendBulkNotification(templateId, userIds, data);
  }
}