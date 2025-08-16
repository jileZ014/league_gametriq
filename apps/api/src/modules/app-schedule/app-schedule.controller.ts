import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AppScheduleService } from './app-schedule.service';

@ApiTags('schedules')
@Controller('schedules')
export class AppScheduleController {
  constructor(private readonly scheduleService: AppScheduleService) {}

  @Get()
  @ApiOperation({ summary: 'Get all schedules' })
  @ApiQuery({ name: 'leagueId', required: false })
  @ApiQuery({ name: 'seasonId', required: false })
  @ApiQuery({ name: 'divisionId', required: false })
  findAll(@Query() query: any) {
    return this.scheduleService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get schedule by ID' })
  findOne(@Param('id') id: string) {
    return this.scheduleService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new schedule' })
  create(@Body() createScheduleDto: any) {
    return this.scheduleService.create(createScheduleDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update schedule' })
  update(@Param('id') id: string, @Body() updateScheduleDto: any) {
    return this.scheduleService.update(id, updateScheduleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete schedule' })
  remove(@Param('id') id: string) {
    return this.scheduleService.remove(id);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate schedule automatically' })
  generateSchedule(@Body() generateDto: any) {
    return this.scheduleService.generateSchedule(generateDto);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get schedule templates' })
  getTemplates() {
    return this.scheduleService.getTemplates();
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create schedule template' })
  createTemplate(@Body() templateDto: any) {
    return this.scheduleService.createTemplate(templateDto);
  }

  @Post(':id/apply-template')
  @ApiOperation({ summary: 'Apply template to schedule' })
  applyTemplate(@Param('id') id: string, @Body() body: { templateId: string }) {
    return this.scheduleService.applyTemplate(id, body.templateId);
  }
}