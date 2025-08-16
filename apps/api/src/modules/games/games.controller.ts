import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GamesService } from './games.service';

@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all games' })
  findAll() {
    return this.gamesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get game by ID' })
  findOne(@Param('id') id: string) {
    return this.gamesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new game' })
  create(@Body() createGameDto: any) {
    return this.gamesService.create(createGameDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update game' })
  update(@Param('id') id: string, @Body() updateGameDto: any) {
    return this.gamesService.update(id, updateGameDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete game' })
  remove(@Param('id') id: string) {
    return this.gamesService.remove(id);
  }

  @Post(':id/score')
  @ApiOperation({ summary: 'Update game score' })
  updateScore(@Param('id') id: string, @Body() scoreData: any) {
    return this.gamesService.updateScore(id, scoreData);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get game statistics' })
  getStatistics(@Param('id') id: string) {
    return this.gamesService.getStatistics(id);
  }
}