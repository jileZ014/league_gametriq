import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TeamsService } from './teams.service';

@ApiTags('teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all teams' })
  @ApiQuery({ name: 'leagueId', required: false })
  @ApiQuery({ name: 'divisionId', required: false })
  @ApiQuery({ name: 'seasonId', required: false })
  findAll(@Query() query: any) {
    return this.teamsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team by ID' })
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new team' })
  create(@Body() createTeamDto: any) {
    return this.teamsService.create(createTeamDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update team' })
  update(@Param('id') id: string, @Body() updateTeamDto: any) {
    return this.teamsService.update(id, updateTeamDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete team' })
  remove(@Param('id') id: string) {
    return this.teamsService.remove(id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get team members' })
  getMembers(@Param('id') id: string) {
    return this.teamsService.getMembers(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add team member' })
  addMember(@Param('id') id: string, @Body() memberData: any) {
    return this.teamsService.addMember(id, memberData);
  }

  @Put(':id/members/:memberId')
  @ApiOperation({ summary: 'Update team member' })
  updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() memberData: any
  ) {
    return this.teamsService.updateMember(id, memberId, memberData);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove team member' })
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string
  ) {
    return this.teamsService.removeMember(id, memberId);
  }

  @Get('standings/:leagueId')
  @ApiOperation({ summary: 'Get league standings' })
  @ApiQuery({ name: 'divisionId', required: false })
  getStandings(
    @Param('leagueId') leagueId: string,
    @Query('divisionId') divisionId?: string
  ) {
    return this.teamsService.getStandings(leagueId, divisionId);
  }

  @Put(':id/standings')
  @ApiOperation({ summary: 'Update team standings' })
  updateStandings(@Param('id') id: string, @Body() standingsData: any) {
    return this.teamsService.updateStandings(id, standingsData);
  }
}