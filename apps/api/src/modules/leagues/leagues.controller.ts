import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LeaguesService } from './leagues.service';

@ApiTags('leagues')
@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all leagues' })
  findAll() {
    return this.leaguesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get league by ID' })
  findOne(@Param('id') id: string) {
    return this.leaguesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new league' })
  create(@Body() createLeagueDto: any) {
    return this.leaguesService.create(createLeagueDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update league' })
  update(@Param('id') id: string, @Body() updateLeagueDto: any) {
    return this.leaguesService.update(id, updateLeagueDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete league' })
  remove(@Param('id') id: string) {
    return this.leaguesService.remove(id);
  }

  @Get(':id/divisions')
  @ApiOperation({ summary: 'Get league divisions' })
  getDivisions(@Param('id') id: string) {
    return this.leaguesService.getDivisions(id);
  }

  @Post(':id/divisions')
  @ApiOperation({ summary: 'Create league division' })
  createDivision(@Param('id') id: string, @Body() divisionData: any) {
    return this.leaguesService.createDivision(id, divisionData);
  }

  @Get(':id/seasons')
  @ApiOperation({ summary: 'Get league seasons' })
  getSeasons(@Param('id') id: string) {
    return this.leaguesService.getSeasons(id);
  }

  @Post(':id/seasons')
  @ApiOperation({ summary: 'Create league season' })
  createSeason(@Param('id') id: string, @Body() seasonData: any) {
    return this.leaguesService.createSeason(id, seasonData);
  }
}